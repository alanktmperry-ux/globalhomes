import { useEffect, useState, useCallback, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Partner {
  id: string;
  user_id: string;
  partner_code: string;
  display_name: string;
  created_at: string;
  lead_count?: number;
}

interface Lead {
  id: string;
  partner_code: string;
  name: string | null;
  email: string | null;
  suburb_interest: string | null;
  created_at: string;
}

function suggestCode(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return slug ? `${slug}-${suffix}` : suffix;
}

export default function ReferralPartnerManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [leadsByCode, setLeadsByCode] = useState<Record<string, Lead[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: ps }, { data: ls }] = await Promise.all([
      (supabase as any).from('referral_partners').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('partner_buyer_leads').select('*').order('created_at', { ascending: false }),
    ]);
    const leadList = (ls || []) as Lead[];
    const counts: Record<string, number> = {};
    const grouped: Record<string, Lead[]> = {};
    for (const l of leadList) {
      counts[l.partner_code] = (counts[l.partner_code] || 0) + 1;
      (grouped[l.partner_code] ||= []).push(l);
    }
    setLeadsByCode(grouped);
    setPartners(((ps || []) as Partner[]).map((p) => ({ ...p, lead_count: counts[p.partner_code] || 0 })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-suggest partner code when name changes (only if user hasn't customised it)
  const [codeTouched, setCodeTouched] = useState(false);
  useEffect(() => {
    if (!codeTouched) setPartnerCode(displayName ? suggestCode(displayName) : '');
  }, [displayName, codeTouched]);

  const copyUrl = (code: string) => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Referral URL copied', { description: url });
  };

  const handleCreate = async () => {
    if (!email.trim() || !displayName.trim() || !partnerCode.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data: agentRow } = await (supabase as any)
        .from('agents')
        .select('user_id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      const userId = (agentRow as any)?.user_id;
      if (!userId) {
        toast.error('No ListHQ account found for that email — they need to sign up first');
        return;
      }

      const { error } = await (supabase as any).from('referral_partners').insert({
        user_id: userId,
        partner_code: partnerCode.trim(),
        display_name: displayName.trim(),
      });
      if (error) throw error;

      const url = `${window.location.origin}/r/${partnerCode.trim()}`;
      toast.success('Referral partner created', { description: url });
      setEmail('');
      setDisplayName('');
      setPartnerCode('');
      setCodeTouched(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Referral Partners</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage referral partners and track buyer leads attributed to their codes.
        </p>
      </div>

      {/* Create form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Create referral partner</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="rp-email">Account email</Label>
            <Input
              id="rp-email"
              type="email"
              placeholder="steven@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rp-name">Display name</Label>
            <Input
              id="rp-name"
              placeholder="Steven Chen"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rp-code">Partner code</Label>
            <Input
              id="rp-code"
              placeholder="steven-chen-k7x2"
              value={partnerCode}
              onChange={(e) => {
                setCodeTouched(true);
                setPartnerCode(e.target.value);
              }}
            />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Create partner
        </Button>
      </div>

      {/* Partners table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No referral partners yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-[12px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-8"></th>
                <th className="text-left px-4 py-2 font-medium">Display Name</th>
                <th className="text-left px-4 py-2 font-medium">Partner Code</th>
                <th className="text-left px-4 py-2 font-medium">Referral URL</th>
                <th className="text-left px-4 py-2 font-medium">Leads</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const isOpen = expanded === p.id;
                const url = `${window.location.origin}/r/${p.partner_code}`;
                const partnerLeads = leadsByCode[p.partner_code] || [];
                return (
                  <Fragment key={p.id}>
                    <tr className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : p.id)}
                          className="p-1 rounded hover:bg-muted"
                          aria-label="Toggle leads"
                        >
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.display_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.partner_code}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => copyUrl(p.partner_code)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          title={url}
                        >
                          <Copy size={12} /> Copy URL
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Users size={12} className="text-muted-foreground" />
                          {p.lead_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20 border-t border-border">
                        <td colSpan={6} className="px-6 py-4">
                          {partnerLeads.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No leads yet for this partner.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left py-1 font-medium">Name</th>
                                  <th className="text-left py-1 font-medium">Email</th>
                                  <th className="text-left py-1 font-medium">Suburb</th>
                                  <th className="text-left py-1 font-medium">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {partnerLeads.map((l) => (
                                  <tr key={l.id} className="border-t border-border/50">
                                    <td className="py-1.5">{l.name || '—'}</td>
                                    <td className="py-1.5">{l.email || '—'}</td>
                                    <td className="py-1.5">{l.suburb_interest || '—'}</td>
                                    <td className="py-1.5 text-muted-foreground">
                                      {new Date(l.created_at).toLocaleDateString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
