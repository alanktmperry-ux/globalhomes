import { useEffect, useState } from 'react';
import type { PropertyRow } from '@/features/agents/types/listing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Flame, Thermometer, Snowflake, Phone, Mail, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { calcIntentScore, getIntentTier, INTENT_TOOLTIP } from '@/features/agents/lib/intentScore';
import { toast } from 'sonner';

const AU_DATE = (d: string) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

interface Props {
  listing: PropertyRow;
}

const URGENCY_MAP: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  ready_to_buy: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Ready to Buy' },
  actively_searching: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Actively Searching' },
  just_browsing: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Browsing' },
};

const ListingBuyerLeadsTab = ({ listing }: Props) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('property_id', listing.id)
        .order('created_at', { ascending: false });
      setLeads(data || []);
      const drafts: Record<string, string> = {};
      (data || []).forEach((l: any) => { drafts[l.id] = l.agent_notes || ''; });
      setNoteDrafts(drafts);
      setLoading(false);
    };
    fetchLeads();
  }, [listing.id]);

  const saveNote = async (leadId: string) => {
    setSavingNote(leadId);
    const { error } = await supabase
      .from('leads')
      .update({ agent_notes: noteDrafts[leadId] || null } as any)
      .eq('id', leadId);
    if (error) {
      toast.error('Could not save note');
    } else {
      toast.success('Note saved');
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, agent_notes: noteDrafts[leadId] } : l));
    }
    setSavingNote(null);
  };

  const convertToContact = async (lead: any) => {
    if (!user) return;
    setConverting(lead.id);
    try {
      // Find agent + agency
      const { data: agent } = await supabase
        .from('agents')
        .select('id, agency_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check existing contact by email
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', lead.user_email || '')
        .maybeSingle();

      let contactId = existing?.id;
      if (!contactId) {
        const [first, ...rest] = (lead.user_name || '').trim().split(' ');
        const { data: inserted, error: insErr } = await supabase
          .from('contacts')
          .insert({
            first_name: first || 'Buyer',
            last_name: rest.join(' ') || null,
            email: lead.user_email || null,
            phone: lead.user_phone || null,
            contact_type: 'buyer',
            source: lead.source || 'enquiry',
            assigned_agent_id: agent?.id || null,
            agency_id: agent?.agency_id || null,
            created_by: user.id,
            buyer_pipeline_stage: 'new',
            notes: lead.message || null,
          } as any)
          .select('id')
          .single();
        if (insErr) throw insErr;
        contactId = inserted.id;
      }

      await supabase
        .from('leads')
        .update({ converted_contact_id: contactId } as any)
        .eq('id', lead.id);

      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, converted_contact_id: contactId } : l));
      toast.success(existing ? 'Linked to existing contact' : 'Converted to contact');
    } catch (e: any) {
      toast.error(`Conversion failed — ${e?.message || 'try again'}`);
    } finally {
      setConverting(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading leads...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Buyer Leads ({leads.length})</h3>
      </div>

      {leads.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No buyer leads yet for this listing.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const u = URGENCY_MAP[l.urgency] || URGENCY_MAP.just_browsing;
            const intent = calcIntentScore(l);
            const tier = getIntentTier(intent);
            const isConverted = !!l.converted_contact_id;
            return (
              <div key={l.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{l.user_name}</p>
                      <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>{u.icon} {u.label}</Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`${tier.className} text-[10px] gap-0.5 border-0 cursor-help`}>{tier.label} {intent}</Badge>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs max-w-[200px]">{INTENT_TOOLTIP}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {l.source && <Badge variant="outline" className="text-[10px] capitalize">{l.source}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {l.user_email && (
                        <a href={`mailto:${l.user_email}`} className="flex items-center gap-1 hover:text-foreground">
                          <Mail size={12} /> {l.user_email}
                        </a>
                      )}
                      {l.user_phone && (
                        <a href={`tel:${l.user_phone}`} className="flex items-center gap-1 hover:text-foreground">
                          <Phone size={12} /> {l.user_phone}
                        </a>
                      )}
                      <span>{AU_DATE(l.created_at)}</span>
                    </div>
                    {l.message && <p className="text-xs text-muted-foreground mt-2 italic">"{l.message}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isConverted ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px] gap-1">
                        <CheckCircle2 size={11} /> In Contacts
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => convertToContact(l)}
                        disabled={converting === l.id || !l.user_email}
                      >
                        {converting === l.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                        Convert to Contact
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Textarea
                    value={noteDrafts[l.id] ?? ''}
                    onChange={e => setNoteDrafts(prev => ({ ...prev, [l.id]: e.target.value }))}
                    placeholder="Private notes about this lead..."
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex justify-end mt-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px] h-7"
                      onClick={() => saveNote(l.id)}
                      disabled={savingNote === l.id || (noteDrafts[l.id] || '') === (l.agent_notes || '')}
                    >
                      {savingNote === l.id ? <Loader2 size={11} className="animate-spin mr-1" /> : null}
                      Save note
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListingBuyerLeadsTab;
