import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Flame, Thermometer, Snowflake, Phone, Mail } from 'lucide-react';
import { calcIntentScore, getIntentTier, INTENT_TOOLTIP } from '@/features/agents/lib/intentScore';

const AU_DATE = (d: string) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

interface Props {
  listing: any;
}

const URGENCY_MAP: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  ready_to_buy: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Ready to Buy' },
  actively_searching: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Actively Searching' },
  just_browsing: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Browsing' },
};

const ListingBuyerLeadsTab = ({ listing }: Props) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('property_id', listing.id)
        .order('created_at', { ascending: false });
      setLeads(data || []);
      setLoading(false);
    };
    fetchLeads();
  }, [listing.id]);

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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Urgency</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const u = URGENCY_MAP[l.urgency] || URGENCY_MAP.just_browsing;
                return (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="p-3 font-medium">{l.user_name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {l.user_email && <a href={`mailto:${l.user_email}`} className="text-muted-foreground hover:text-foreground"><Mail size={14} /></a>}
                        {l.user_phone && <a href={`tel:${l.user_phone}`} className="text-muted-foreground hover:text-foreground"><Phone size={14} /></a>}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>{u.icon} {u.label}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{l.status || 'new'}</Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{AU_DATE(l.created_at)}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{l.message || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListingBuyerLeadsTab;
