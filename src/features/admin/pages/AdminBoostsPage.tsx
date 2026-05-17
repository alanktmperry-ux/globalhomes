import { useCallback, useEffect, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Loader2, Zap, Star, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface BoostRow {
  id: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  boost_requested_tier: string | null;
  boost_requested_at: string | null;
  boost_tier: string | null;
  is_featured: boolean | null;
  featured_until: string | null;
  agent_id: string | null;
  agents: { name: string | null; email: string | null; agency: string | null } | null;
}

const fmtDate = (s: string | null) =>
  s ? format(parseISO(s), 'dd MMM yyyy') : '—';

const TierBadge = ({ tier }: { tier: string | null }) =>
  tier === 'premier' ? (
    <Badge className="bg-blue-600 hover:bg-blue-600 text-white gap-1">
      <Star className="h-3 w-3" /> Premier · $99
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <Zap className="h-3 w-3" /> Featured · $49
    </Badge>
  );

export default function AdminBoostsPage() {
  const [pending, setPending] = useState<BoostRow[]>([]);
  const [active, setActive] = useState<BoostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const select =
      'id, address, suburb, state, boost_requested_tier, boost_requested_at, boost_tier, is_featured, featured_until, agent_id, agents(name, email, agency)';

    const [pendingRes, activeRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('properties') as any)
        .select(select)
        .not('boost_requested_at', 'is', null)
        .eq('is_featured', false)
        .order('boost_requested_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('properties') as any)
        .select(select)
        .eq('is_featured', true)
        .gt('featured_until', now)
        .order('featured_until', { ascending: true }),
    ]);

    setPending((pendingRes.data ?? []) as BoostRow[]);
    setActive((activeRes.data ?? []) as BoostRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async (row: BoostRow) => {
    setActing(row.id);
    const tier = row.boost_requested_tier ?? 'featured';
    const until = addDays(new Date(), 30).toISOString();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('properties') as any)
        .update({
          is_featured: true,
          boost_tier: tier,
          featured_until: until,
          boost_requested_at: null,
          boost_requested_tier: null,
        })
        .eq('id', row.id);
      if (error) throw error;

      if (row.agent_id) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: agent } = await (supabase.from('agents') as any)
            .select('id')
            .eq('id', row.agent_id)
            .maybeSingle();
          if (agent?.id) {
            await supabase.functions
              .invoke('dispatch-notification', {
                body: {
                  agent_id: agent.id,
                  event_key: 'listing_approved',
                  type: 'boost_activated',
                  title: `${tier === 'premier' ? 'Premier' : 'Featured'} boost is live`,
                  message: `${row.address} is now featured in ${row.suburb} until ${format(parseISO(until), 'dd MMM yyyy')}.`,
                  property_id: row.id,
                },
              })
              .catch(() => {});
          }
        } catch {
          /* notification failure is non-fatal */
        }
      }

      toast.success(`Boost activated — live until ${format(parseISO(until), 'dd MMM yyyy')}`);
      await load();
    } catch (e) {
      toast.error('Activation failed — check console');
      console.error(e);
    } finally {
      setActing(null);
    }
  };

  const cancel = async (row: BoostRow) => {
    setActing(row.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('properties') as any)
        .update({
          is_featured: false,
          boost_tier: null,
          featured_until: null,
          boost_requested_at: null,
          boost_requested_tier: null,
        })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Boost cancelled');
      await load();
    } catch (e) {
      toast.error('Cancel failed');
      console.error(e);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">Boost Activation</h1>
        <p className="text-sm text-muted-foreground">
          Approve pending boost requests and manage active featured listings.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Pending requests */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Pending requests</h2>
              {pending.length > 0 && (
                <Badge variant="secondary">{pending.length}</Badge>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-4">
                No pending boost requests.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium">{row.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.suburb}
                            {row.state ? `, ${row.state}` : ''}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{row.agents?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.agents?.agency ?? row.agents?.email ?? ''}
                          </p>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={row.boost_requested_tier} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtDate(row.boost_requested_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={`/property/${row.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => activate(row)}
                              disabled={acting === row.id}
                            >
                              {acting === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Activate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Active boosts */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Active boosts</h2>
              {active.length > 0 && (
                <Badge variant="secondary">{active.length}</Badge>
              )}
            </div>

            {active.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-4">
                No active boosts.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.map((row) => {
                      const daysLeft = row.featured_until
                        ? Math.ceil(
                            (new Date(row.featured_until).getTime() - Date.now()) /
                              86400000,
                          )
                        : null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <p className="font-medium">{row.address}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.suburb}
                              {row.state ? `, ${row.state}` : ''}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{row.agents?.name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.agents?.agency ?? row.agents?.email ?? ''}
                            </p>
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={row.boost_tier} />
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{fmtDate(row.featured_until)}</p>
                            {daysLeft != null && (
                              <p className="text-xs text-muted-foreground">
                                {daysLeft}d remaining
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={`/property/${row.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancel(row)}
                                disabled={acting === row.id}
                              >
                                {acting === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
