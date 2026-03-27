import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, MapPin, Home, BedDouble, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { toast } from 'sonner';

/* ── Types ── */

interface SellerOpportunity {
  id: string;
  propertyId: string;
  score: number;
  signals: Record<string, any>;
  summary: string | null;
  scoredAt: string;
  address: string;
  suburb: string;
  state: string;
  price: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  agentId: string | null;
}

type Filter = 'all' | 'hot' | 'warm' | 'watch';

const FILTERS: { key: Filter; label: string; min: number }[] = [
  { key: 'all', label: 'All', min: 50 },
  { key: 'hot', label: '🔥 Hot', min: 80 },
  { key: 'warm', label: '⚡ Warm', min: 65 },
  { key: 'watch', label: '👀 Watch', min: 50 },
];

/* ── Helpers ── */

function scoreColor(score: number) {
  if (score >= 70) return 'hsl(var(--success, 142 71% 45%))';
  if (score >= 50) return 'hsl(var(--primary))';
  return 'hsl(var(--muted-foreground))';
}

function formatAUD(n: number | null) {
  if (!n) return 'Contact Agent';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

const ScoreRing = ({ score, size = 48 }: { score: number; size?: number }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={scoreColor(score)} strokeWidth="4"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-extrabold">
        {score}
      </span>
    </div>
  );
};

function renderSignalChips(signals: Record<string, any>) {
  const chips: { label: string; emoji: string }[] = [];
  if (signals.dom_ratio && signals.dom_ratio > 0) chips.push({ emoji: '📅', label: `${signals.dom_ratio}x median DOM` });
  if (signals.price_cuts && signals.price_cuts > 0) chips.push({ emoji: '📉', label: `${signals.price_cuts} price cut${signals.price_cuts > 1 ? 's' : ''}` });
  if (signals.suburb_growth_pct != null && signals.suburb_growth_pct < 0) chips.push({ emoji: '📊', label: `Suburb ${signals.suburb_growth_pct}%` });
  if (signals.listing_refreshes && signals.listing_refreshes > 0) chips.push({ emoji: '🔄', label: `${signals.listing_refreshes} relists` });
  if (signals.vendor_motivation) chips.push({ emoji: '🏷️', label: signals.vendor_motivation });
  if (signals.equity_position) chips.push({ emoji: '💰', label: signals.equity_position });
  // Fallback: show any remaining numeric signals > 0
  for (const [k, v] of Object.entries(signals)) {
    if (typeof v === 'number' && v > 0 && !['dom_ratio', 'price_cuts', 'suburb_growth_pct', 'listing_refreshes'].includes(k)) {
      chips.push({ emoji: '📌', label: `${k.replace(/_/g, ' ')}: ${v}` });
    }
  }
  return chips;
}

/* ── Component ── */

const PreMarketPage = () => {
  const { user } = useAuth();
  const { canAccessNetwork, loading: subLoading } = useSubscription();
  const [items, setItems] = useState<SellerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [letterModal, setLetterModal] = useState<{ open: boolean; content: string; loading: boolean; property: SellerOpportunity | null }>({
    open: false, content: '', loading: false, property: null,
  });
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('seller_likelihood_scores')
        .select('*, properties(id, title, address, suburb, state, price, property_type, bedrooms, agent_id)')
        .gte('score', 50)
        .order('score', { ascending: false })
        .limit(50) as any;

      const mapped: SellerOpportunity[] = (data || []).map((row: any) => {
        const p = row.properties || {};
        return {
          id: row.id,
          propertyId: row.property_id,
          score: row.score,
          signals: row.signals || {},
          summary: row.summary,
          scoredAt: row.scored_at,
          address: p.address || 'Unknown',
          suburb: p.suburb || '',
          state: p.state || '',
          price: p.price,
          propertyType: p.property_type,
          bedrooms: p.bedrooms,
          agentId: p.agent_id,
        };
      });
      setItems(mapped);
    } catch (err) {
      console.warn('[PreMarket] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter(item => {
    if (filter === 'hot') return item.score >= 80;
    if (filter === 'warm') return item.score >= 65 && item.score < 80;
    if (filter === 'watch') return item.score >= 50 && item.score < 65;
    return true;
  });

  const handleClaim = async (item: SellerOpportunity) => {
    if (!user) return;
    try {
      await supabase.from('activities').insert({
        user_id: user.id,
        action: 'seller_opportunity_claimed',
        entity_id: item.propertyId,
        entity_type: 'property',
        description: `Claimed pre-market opportunity at ${item.address}, ${item.suburb}`,
      });
      toast.success('Opportunity claimed — added to your pipeline.');
    } catch {
      toast.error('Failed to claim opportunity');
    }
  };

  const handleDraftLetter = async (item: SellerOpportunity) => {
    setLetterModal({ open: true, content: '', loading: true, property: item });
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/generate-listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          propertyType: item.propertyType || 'Property',
          beds: item.bedrooms || 0,
          baths: 0,
          parking: 0,
          suburb: item.suburb,
          state: item.state,
          price: formatAUD(item.price),
          features: [],
          tone: 'seller_outreach',
        }),
      });

      if (!res.ok) throw new Error('Generation failed');

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE chunks
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  full += delta;
                  setLetterModal(prev => ({ ...prev, content: full }));
                }
              } catch { /* skip parse errors */ }
            }
          }
        }
      }

      setLetterModal(prev => ({ ...prev, loading: false }));
    } catch (err) {
      console.error('[PreMarket] Draft letter failed:', err);
      setLetterModal(prev => ({ ...prev, loading: false, content: 'Failed to generate letter. Please try again.' }));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letterModal.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Letter copied to clipboard');
  };

  if (!subLoading && !canAccessNetwork) {
    return <UpgradeGate requiredPlan="Pro" message="Pre-Market Opportunities require a Pro plan or higher to access AI-scored seller likelihood intelligence." />;
  }

  return (
    <div>
      <DashboardHeader
        title="Pre-Market Opportunities"
        subtitle="Properties showing seller likelihood signals in your area."
      />

      {/* Filter bar */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Target size={32} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No pre-market opportunities found</p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-[280px]">
            Scores update weekly every Monday.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <AnimatePresence>
            {filtered.map((item, idx) => {
              const chips = renderSignalChips(item.signals);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-card border border-border rounded-xl p-4 space-y-3"
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <ScoreRing score={item.score} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.address}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} /> {item.suburb}{item.state ? `, ${item.state}` : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{formatAUD(item.price)}</span>
                        {item.propertyType && (
                          <span className="flex items-center gap-0.5"><Home size={10} /> {item.propertyType}</span>
                        )}
                        {item.bedrooms && (
                          <span className="flex items-center gap-0.5"><BedDouble size={10} /> {item.bedrooms} bed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Signal chips */}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 border-border bg-secondary/50">
                          {c.emoji} {c.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {item.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-xs gap-1.5" onClick={() => handleClaim(item)}>
                      <Target size={14} /> Claim Opportunity
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={() => handleDraftLetter(item)}>
                      Draft Outreach Letter
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Draft letter modal */}
      <Dialog open={letterModal.open} onOpenChange={open => !open && setLetterModal(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Outreach Letter{letterModal.property ? ` — ${letterModal.property.address}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="bg-secondary rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap min-h-[120px]">
            {letterModal.loading && !letterModal.content && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Generating letter…
              </div>
            )}
            {letterModal.content}
            {letterModal.loading && letterModal.content && (
              <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />
            )}
          </div>
          {letterModal.content && !letterModal.loading && (
            <Button size="sm" variant="outline" className="gap-1.5 self-end" onClick={handleCopy}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Letter</>}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreMarketPage;
