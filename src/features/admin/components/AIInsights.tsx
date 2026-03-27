import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Mic, Users, BarChart3, ShoppingBag, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AIInsights = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    voiceSearches30d: 0,
    voiceSearches7d: 0,
    buyerConciergeLeads: 0,
    sellerScoresHigh: 0,
    sellerScoresMed: 0,
    sellerScoresLow: 0,
    marketplacePurchases: 0,
    offersGenerated: 0,
    topSuburbs: [] as { suburb: string; count: number }[],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [
        vs30, vs7,
        conciergeLeads,
        sellerScores,
        purchased,
        offers,
        suburbData,
      ] = await Promise.all([
        supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('voice_searches').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('seller_likelihood_scores' as any).select('score'),
        supabase.from('consumer_profiles' as any).select('id', { count: 'exact', head: true }).not('purchased_by', 'is', null),
        supabase.from('offers' as any).select('id', { count: 'exact', head: true }).gte('created_at', d30),
        supabase.from('voice_searches').select('location').gte('created_at', d30).limit(200),
      ]);

      const scores = (sellerScores.data || []) as unknown as { score: number }[];
      const high = scores.filter(s => s.score >= 70).length;
      const med = scores.filter(s => s.score >= 40 && s.score < 70).length;
      const low = scores.filter(s => s.score < 40).length;

      const suburbCount = new Map<string, number>();
      (suburbData.data || []).forEach((v: any) => {
        const loc = v.location;
        if (loc) suburbCount.set(loc, (suburbCount.get(loc) || 0) + 1);
      });
      const topSuburbs = Array.from(suburbCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([suburb, count]) => ({ suburb, count }));

      setData({
        voiceSearches30d: vs30.count || 0,
        voiceSearches7d: vs7.count || 0,
        buyerConciergeLeads: conciergeLeads.count || 0,
        sellerScoresHigh: high,
        sellerScoresMed: med,
        sellerScoresLow: low,
        marketplacePurchases: purchased.count || 0,
        offersGenerated: offers.count || 0,
        topSuburbs,
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: number | string; sub?: string; color: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="text-primary" size={20} />
          <h2 className="text-xl font-bold text-foreground">AI Insights</h2>
        </div>
        <p className="text-sm text-muted-foreground">Live activity across all 4 AI builds — last 30 days.</p>
      </div>

      {/* Build 1 — Buyer Concierge */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Build 1 — AI Buyer Concierge</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard icon={Mic} label="Voice Searches (30d)" value={data.voiceSearches30d} sub={`${data.voiceSearches7d} in last 7 days`} color="bg-primary/10 text-primary" />
          <StatCard icon={Users} label="Concierge Leads (30d)" value={data.buyerConciergeLeads} color="bg-accent text-accent-foreground" />
        </div>
        {data.topSuburbs.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Top searched suburbs (30d)</p>
            <div className="flex flex-wrap gap-2">
              {data.topSuburbs.map(({ suburb, count }) => (
                <span key={suburb} className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
                  {suburb} · {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Build 2 — Seller Likelihood Scores */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Build 2 — Seller Likelihood Scores</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{data.sellerScoresHigh}</p>
            <p className="text-sm text-muted-foreground">High motivation</p>
            <p className="text-xs text-muted-foreground/70">Score 70+</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-accent-foreground">{data.sellerScoresMed}</p>
            <p className="text-sm text-muted-foreground">Medium motivation</p>
            <p className="text-xs text-muted-foreground/70">Score 40–69</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{data.sellerScoresLow}</p>
            <p className="text-sm text-muted-foreground">Low motivation</p>
            <p className="text-xs text-muted-foreground/70">Score 0–39</p>
          </div>
        </div>
      </div>

      {/* Build 3 — AI Offer Generator */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Build 3 — AI Offer Generator</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard icon={FileText} label="Offers Generated (30d)" value={data.offersGenerated} color="bg-primary/10 text-primary" />
        </div>
      </div>

      {/* Build 4 — Lead Marketplace */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Build 4 — Lead Marketplace</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard icon={ShoppingBag} label="Marketplace Purchases" value={data.marketplacePurchases} color="bg-accent text-accent-foreground" />
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
