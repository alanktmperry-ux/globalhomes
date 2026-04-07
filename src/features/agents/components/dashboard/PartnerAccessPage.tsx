import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Handshake, Send, UserX, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface PartnerAgencyRow {
  id: string;
  status: string;
  access_level: string;
  invited_at: string;
  accepted_at: string | null;
  partners: {
    company_name: string;
    contact_name: string;
    contact_email: string;
    logo_url: string | null;
  } | null;
}

const ACCESS_LABELS: Record<string, { label: string; color: string }> = {
  trust_only: { label: 'Trust only', color: 'bg-muted text-muted-foreground' },
  trust_and_pm: { label: 'Trust + PM', color: 'bg-blue-500/10 text-blue-600' },
  full_pm: { label: 'Full PM', color: 'bg-violet-500/10 text-violet-600' },
};

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  revoked: { label: 'Revoked', variant: 'destructive' },
};

const PartnerAccessPage = () => {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerAgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('trust_and_pm');
  const [sending, setSending] = useState(false);

  const fetchAgent = useCallback(async () => {
    if (!user) return;
    const { data: agent } = await supabase
      .from('agents')
      .select('id, agency_id')
      .eq('user_id', user.id)
      .single();
    if (agent) {
      setAgentId(agent.id);
      setAgencyId(agent.agency_id);
    }
  }, [user]);

  const fetchPartners = useCallback(async () => {
    if (!agencyId) return;
    const { data } = await supabase
      .from('partner_agencies')
      .select('id, status, access_level, invited_at, accepted_at, partners(company_name, contact_name, contact_email, logo_url)')
      .eq('agency_id', agencyId)
      .order('invited_at', { ascending: false });
    if (data) setPartners(data as unknown as PartnerAgencyRow[]);
  }, [agencyId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  useEffect(() => {
    if (!agencyId) return;
    const load = async () => {
      setLoading(true);
      await fetchPartners();
      setLoading(false);
    };
    load();
  }, [agencyId, fetchPartners]);

  const handleInvite = async () => {
    if (!partnerEmail.trim() || !agencyId || !agentId) {
      toast.error('Please enter a partner email address.');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-partner', {
        body: { partnerEmail, agencyId, agentId, accessLevel },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Invitation sent to ${partnerEmail}`);
      setPartnerEmail('');
      await fetchPartners();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
    setSending(false);
  };

  const handleRevoke = async (id: string, companyName: string) => {
    if (!confirm(`Revoke access for ${companyName}? They will no longer be able to manage your trust accounting.`)) return;
    try {
      const { error } = await supabase
        .from('partner_agencies')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
        } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success(`Access revoked for ${companyName}`);
      await fetchPartners();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (!agencyId && !loading) {
    return (
      <div className="flex-1 p-6 lg:p-10">
        <p className="text-muted-foreground">You need to be part of an agency to manage partner access.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-1">
        <Handshake size={22} className="text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Partner Access</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Invite trust accounting partners to manage your agency's books.
      </p>

      {/* Invite form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Invite a trust accounting partner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Give a partner company access to your trust accounting and property management. They will receive an email invitation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="partner@example.com"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              className="flex-1 h-10 px-4 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger className="w-full sm:w-56 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trust_only">Trust accounting only</SelectItem>
                <SelectItem value="trust_and_pm">Trust + property management</SelectItem>
                <SelectItem value="full_pm">Full property management</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={sending || !partnerEmail.trim()} size="sm">
            {sending ? <><Loader2 className="animate-spin mr-2" size={14} /> Sending…</> : <><Send size={14} className="mr-2" /> Send invitation</>}
          </Button>
        </CardContent>
      </Card>

      <Separator className="mb-8" />

      {/* Partners list */}
      <h2 className="font-display text-lg font-bold text-foreground mb-4">Connected partners</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : partners.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto text-muted-foreground mb-4" size={36} />
            <p className="text-sm text-muted-foreground">
              No partners invited yet. Use the form above to invite your trust accounting specialist.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {partners.map((pa) => {
            const p = pa.partners;
            const statusInfo = STATUS_BADGES[pa.status] || STATUS_BADGES.pending;
            const accessInfo = ACCESS_LABELS[pa.access_level] || ACCESS_LABELS.trust_and_pm;

            return (
              <Card key={pa.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Avatar */}
                  {p?.logo_url ? (
                    <img src={p.logo_url} alt={p.company_name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {p ? getInitials(p.company_name) : '??'}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p?.company_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p?.contact_name} · {p?.contact_email}</p>
                  </div>

                  {/* Badges */}
                  <div className="hidden sm:flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${accessInfo.color}`}>
                      {accessInfo.label}
                    </span>
                    <Badge variant={statusInfo.variant} className="text-[10px]">
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Date */}
                  <span className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(pa.invited_at), 'dd/MM/yyyy')}
                  </span>

                  {/* Actions */}
                  {pa.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(pa.id, p?.company_name || 'this partner')}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserX size={14} className="mr-1" /> Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartnerAccessPage;
