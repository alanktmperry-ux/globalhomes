import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Lock, Sparkles, Loader2, MapPin, Home, DollarSign, BedDouble, Phone, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardHeader from './DashboardHeader';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface ConsumerLead {
  id: string;
  name: string;
  email: string | null;
  buying_situation: string;
  budget_min: number;
  budget_max: number;
  preferred_suburbs: string[];
  preferred_type: string;
  min_bedrooms: number;
  lead_score: number;
  is_purchasable: boolean;
  created_at: string;
}

interface PurchasedBuyer {
  name: string;
  email: string;
  buying_situation: string;
  budget_min: number;
  budget_max: number;
  preferred_suburbs: string[];
  preferred_type: string;
  min_bedrooms: number;
}

const ScoreRing = ({ score, size = 44 }: { score: number; size?: number }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 70 ? 'hsl(var(--success))' : score >= 40 ? 'hsl(var(--warning, 45 93% 47%))' : 'hsl(var(--muted-foreground))';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="text-xs font-bold" fill="currentColor">{score}</text>
    </svg>
  );
};

const LeadMarketplacePage = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [leads, setLeads] = useState<ConsumerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<PurchasedBuyer | null>(null);

  const isPremium = plan === 'pro' || plan === 'agency' || plan === 'enterprise' || plan === 'demo';

  useEffect(() => {
    if (!user) return;
    supabase.from('agents').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setAgentId(data.id);
    });
  }, [user]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('consumer_profiles_marketplace' as any)
      .select('id, name, email, buying_situation, budget_min, budget_max, preferred_suburbs, preferred_type, min_bedrooms, lead_score, is_purchasable, created_at')
      .eq('is_purchasable', true)
      .order('lead_score', { ascending: false }) as any;

    if (!error && data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handlePurchase = async (lead: ConsumerLead) => {
    if (!agentId) return;
    setPurchasing(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-lead', {
        body: { consumer_profile_id: lead.id, agent_id: agentId },
      });
      if (error) throw error;
      if (data?.buyer) {
        setSuccessModal(data.buyer);
        setLeads(prev => prev.filter(l => l.id !== lead.id));
        toast({ title: 'Lead purchased!', description: `You now have access to ${data.buyer.name}'s contact details.` });
      }
    } catch (err: unknown) {
      toast({ title: 'Purchase failed', description: getErrorMessage(err) || 'Please try again', variant: 'destructive' });
    } finally {
      setPurchasing(null);
    }
  };

  if (!isPremium) {
    return <UpgradeGate requiredPlan="Pro" message="The Lead Marketplace is available on Pro plans and above. Upgrade to purchase qualified buyer leads." />;
  }

  const formatBudget = (min: number, max: number) => {
    const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (max) return `Up to ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return 'Not specified';
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Lead Marketplace" subtitle="Purchase qualified buyer leads from voice search." />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShoppingBag size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No leads available right now</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            New consumer leads are added as buyers use voice search on ListHQ.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {leads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <ScoreRing score={lead.lead_score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                        {lead.buying_situation}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <DollarSign size={12} className="text-muted-foreground shrink-0" />
                      <span className="font-medium">{formatBudget(lead.budget_min, lead.budget_max)}</span>
                    </div>
                  </div>
                </div>

                {/* Suburbs */}
                {lead.preferred_suburbs?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.preferred_suburbs.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-foreground">
                        <MapPin size={8} className="text-muted-foreground" />{s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Property type & beds */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Home size={12} />{lead.preferred_type || 'Any'}</span>
                  <span className="flex items-center gap-1"><BedDouble size={12} />{lead.min_bedrooms}+ beds</span>
                </div>

                {/* Show unlocked name if purchased */}
                {lead.name !== 'Verified Buyer' && lead.email && (
                  <p className="text-xs font-medium text-foreground">
                    {lead.name} — {lead.email}
                  </p>
                )}

                {/* Blurred contact preview */}
                <div className="relative rounded-lg bg-muted/50 border border-border p-3 flex items-center gap-3">
                  <Lock size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-muted-foreground/20 rounded blur-[4px] mb-1.5" />
                    <div className="h-2.5 w-32 bg-muted-foreground/15 rounded blur-[4px]" />
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchase(lead)}
                  disabled={purchasing === lead.id}
                  className="w-full"
                >
                  {purchasing === lead.id ? (
                    <Loader2 size={14} className="animate-spin mr-2" />
                  ) : (
                    <ShoppingBag size={14} className="mr-2" />
                  )}
                  Purchase Lead — $29
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Success Modal */}
      <Dialog open={!!successModal} onOpenChange={() => setSuccessModal(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles size={20} className="text-primary" />
              Lead Purchased!
            </DialogTitle>
          </DialogHeader>
          {successModal && (
            <div className="space-y-4">
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">{successModal.name}</p>
                <p className="text-xs text-muted-foreground">{successModal.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">{successModal.buying_situation}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {formatBudget(successModal.budget_min, successModal.budget_max)}
                  </Badge>
                  {successModal.preferred_suburbs?.map(s => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <a href={`https://wa.me/?text=Hi ${encodeURIComponent(successModal.name)}, I'm reaching out from ListHQ regarding your property search.`} target="_blank" rel="noopener noreferrer">
                    <Phone size={14} className="mr-1.5" /> WhatsApp
                  </a>
                </Button>
                <Button asChild className="flex-1">
                  <a href={`mailto:${successModal.email}?subject=Your property search on ListHQ&body=Hi ${encodeURIComponent(successModal.name)},`}>
                    <Mail size={14} className="mr-1.5" /> Email
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadMarketplacePage;
