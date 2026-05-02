import { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, Copy, Plus, Users, CheckCircle2, Percent, DollarSign, MessageCircle, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TIER_COMMISSION_AUD, TIER_THRESHOLDS, TIER_STYLES, LEAD_STATUS_STYLES, type ReferralTier } from '@/features/referral/lib/constants';
import { SubmitReferralModal } from '@/features/referral/components/SubmitReferralModal';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

interface ReferralAgent {
  id: string;
  full_name: string;
  email: string;
  country: string;
  referral_code: string;
  status: string;
  tier: ReferralTier;
  total_referrals: number;
  converted_referrals: number;
  total_commission_aud: number;
}

interface ReferralLead {
  id: string;
  buyer_name: string | null;
  buyer_country: string | null;
  property_url: string | null;
  status: string;
  commission_aud: number;
  created_at: string;
}

export default function ReferralDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [agent, setAgent] = useState<ReferralAgent | null>(null);
  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  const fetchData = useCallback(async (uid: string) => {
    const { data: agentRow, error: agentErr } = await supabase
      .from('referral_agents')
      .select('id, full_name, email, country, referral_code, status, tier, total_referrals, converted_referrals, total_commission_aud')
      .eq('user_id', uid)
      .maybeSingle();

    if (agentErr) {
      if (import.meta.env.DEV) console.warn('[ReferralDashboard] agent fetch error', agentErr.message);
    }
    if (!agentRow) {
      setRedirect(true);
      return;
    }
    setAgent(agentRow as ReferralAgent);

    const { data: leadRows } = await supabase
      .from('referral_leads')
      .select('id, buyer_name, buyer_country, property_url, status, commission_aud, created_at')
      .eq('referral_agent_id', agentRow.id)
      .order('created_at', { ascending: false });
    setLeads((leadRows as ReferralLead[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setRedirect(true); return; }
    fetchData(user.id);
  }, [user, authLoading, fetchData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (redirect || !agent) return <Navigate to="/refer" replace />;

  const referralLink = `${window.location.origin}/buy?ref=${agent.referral_code}`;
  const conversionRate = agent.total_referrals > 0
    ? Math.round((agent.converted_referrals / agent.total_referrals) * 100)
    : 0;
  const tierStyle = TIER_STYLES[agent.tier];

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const wechatQrUrl = `https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(referralLink)}&choe=UTF-8`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Looking at Australian property? Browse with my ListHQ referral link: ${referralLink}`)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(referralLink)}`;

  return (
    <>
      <Helmet><title>{t('referral.dashboard.title')} | ListHQ</title></Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('referral.dashboard.welcomeBack')}</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t('referral.dashboard.hi', { name: agent.full_name.split(' ')[0] })}</h1>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tierStyle.className}`}>
                  {tierStyle.label} {t('referral.dashboard.tier')}
                </span>
                {agent.status !== 'active' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {agent.status}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={() => setSubmitOpen(true)} size="lg" className="gap-2">
              <Plus size={18} /> {t('referral.dashboard.submitReferral')}
            </Button>
          </div>

          {/* Referral code + share */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/5 to-cyan-accent/5 border border-primary/20 rounded-2xl p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Your referral code</p>
                <p className="font-display text-4xl md:text-5xl font-bold text-primary tracking-widest mt-1">{agent.referral_code}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="text-xs md:text-sm font-mono bg-card border border-border rounded-lg px-3 py-1.5 text-foreground">{referralLink}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(referralLink, 'Link')} className="gap-1.5">
                    <Copy size={13} /> Copy
                  </Button>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <img src={wechatQrUrl} width={140} height={140} alt="WeChat QR for your referral link" className="rounded-lg bg-white p-2 border border-border" />
                <p className="text-[11px] text-muted-foreground mt-1">WeChat scan</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a href={lineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                LINE
              </a>
              <button onClick={() => copy(referralLink, 'Link')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-accent transition-colors">
                <Link2 size={14} /> Copy link
              </button>
            </div>
          </motion.div>

          {/* Prominent Submit Referral CTA */}
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Know a buyer looking for Australian property? Submit their details and earn your commission.
            </p>
            <Button
              onClick={() => setSubmitOpen(true)}
              size="lg"
              className="gap-2 w-full md:w-auto"
            >
              <Plus size={18} /> Submit a referral
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Total referrals" value={agent.total_referrals.toString()} />
            <StatCard icon={CheckCircle2} label="Converted" value={agent.converted_referrals.toString()} />
            <StatCard icon={Percent} label="Conversion rate" value={`${conversionRate}%`} />
            <StatCard icon={DollarSign} label="Total commission" value={`A$${agent.total_commission_aud.toLocaleString()}`} />
          </div>

          {/* Commission rates */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Commission rates</h2>
            <p className="text-sm text-muted-foreground mt-1">Your tier rises automatically as your referrals settle.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Tier</th>
                    <th className="py-2 pr-4 font-medium">Threshold</th>
                    <th className="py-2 pr-4 font-medium text-right">Per settled referral</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_THRESHOLDS.map(({ tier, minSettled }) => {
                    const isCurrent = tier === agent.tier;
                    const style = TIER_STYLES[tier];
                    return (
                      <tr key={tier} className={`border-b border-border last:border-0 ${isCurrent ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.className}`}>
                            {style.label}
                          </span>
                          {isCurrent && <span className="ml-2 text-xs text-primary font-medium">← you</span>}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {minSettled === 0 ? 'Default' : `${minSettled}+ settled`}
                        </td>
                        <td className="py-3 pr-4 text-right font-display font-semibold text-foreground">
                          A${TIER_COMMISSION_AUD[tier].toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leads table */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Your referrals</h2>
            <p className="text-xs text-muted-foreground mt-1">Track each referral from registration through to settlement.</p>
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-muted-foreground mb-3" size={32} />
                <p className="text-sm text-muted-foreground">No referrals yet — share your link to get started</p>
                <Button onClick={() => setSubmitOpen(true)} variant="outline" className="mt-4 gap-2">
                  <Plus size={16} /> Submit your first referral
                </Button>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Buyer</th>
                      <th className="py-2 pr-4 font-medium">Country</th>
                      <th className="py-2 pr-4 font-medium">Property</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => {
                      const pipeline = getPipelineBadge(lead.status);
                      return (
                        <tr key={lead.id} className="border-b border-border last:border-0">
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            {new Date(lead.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 pr-4 font-medium text-foreground">{lead.buyer_name || '—'}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{lead.buyer_country || '—'}</td>
                          <td className="py-3 pr-4 text-muted-foreground max-w-[220px] truncate">{lead.property_url || '—'}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className={pipeline.className}>
                              {pipeline.label}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-right font-display font-semibold text-foreground">
                            {lead.commission_aud > 0 ? `A$${lead.commission_aud.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <SubmitReferralModal
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          agentId={agent.id}
          referralCode={agent.referral_code}
          onSubmitted={() => user && fetchData(user.id)}
        />
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Icon className="text-primary mb-2" size={18} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl md:text-2xl font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function getPipelineBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'new':
      return { label: 'Registered', className: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'enquiry_sent':
    case 'contacted':
      return { label: 'Enquiry', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'under_offer':
      return { label: 'Under Offer', className: 'bg-orange-100 text-orange-800 border-orange-200' };
    case 'settled':
      return { label: 'Settled ✓', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}
