import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Flame, Zap, Snowflake, Phone, MessageSquare, Mail, X, MapPin, Home, DollarSign, BedDouble, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDistanceToNow } from 'date-fns';

interface ConciergeeLead {
  id: string;
  score: number;
  urgency: 'hot' | 'warm' | 'cold';
  transcript: string;
  keywords: string[];
  location: string;
  budget: string;
  propertyType: string;
  bedrooms: string;
  features: string[];
  createdAt: string;
  time: string;
  matched: boolean;
  matchedPropertyName: string | null;
  matchedPropertyAddress: string | null;
  userName: string;
  userEmail: string;
  userPhone: string | null;
}

function extractKeywords(transcript: string): string[] {
  const patterns = [
    /\d+\s*bed/gi, /\d+\s*bath/gi, /pool/gi, /garage/gi, /garden/gi,
    /renovated/gi, /investment/gi, /cash buyer/gi, /move quickly/gi,
    /near\s+\w+/gi, /under\s+\$[\d,]+k?/gi, /granny flat/gi,
    /ocean view/gi, /north facing/gi, /train station/gi,
    /rental yield/gi, /pet friendly/gi, /furnished/gi,
  ];
  const found = new Set<string>();
  for (const pat of patterns) {
    const matches = transcript.match(pat);
    if (matches) matches.forEach(m => found.add(m.trim().toLowerCase()));
  }
  return Array.from(found);
}

const URGENCY_CONFIG = {
  hot:  { icon: <Flame size={12} />,    color: 'bg-destructive/15 text-destructive', label: '🔥 Hot' },
  warm: { icon: <Zap size={12} />,      color: 'bg-primary/15 text-primary',         label: '⚡ Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground',     label: '❄️ Cold' },
};

function scoreColor(score: number) {
  if (score >= 70) return 'hsl(var(--success, 142 71% 45%))';
  if (score >= 40) return 'hsl(var(--primary))';
  return 'hsl(var(--muted-foreground))';
}

const ScoreRing = ({ score, size = 56 }: { score: number; size?: number }) => {
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
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold">
        {score}
      </span>
    </div>
  );
};

const BuyerConciergePage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<ConciergeeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find(l => l.id === selectedId);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agent } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from('leads')
        .select('*, properties(title, address, suburb)')
        .eq('agent_id', agent.id)
        .filter('search_context->>source', 'eq', 'ai_buyer_concierge')
        .order('created_at', { ascending: false })
        .limit(50);

      const mapped: ConciergeeLead[] = (rows || []).map((lead: any) => {
        const ctx = (lead.search_context || {}) as Record<string, any>;
        const pq = ctx.parsed_query || {};
        const prop = lead.properties as any;
        const score = lead.score || 30;
        const transcript = lead.message || '';

        return {
          id: lead.id,
          score,
          urgency: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
          transcript,
          keywords: extractKeywords(transcript),
          location: pq.location || pq.suburb || 'Unknown',
          budget: pq.budget || lead.budget_range || '—',
          propertyType: pq.property_type || pq.propertyType || '—',
          bedrooms: pq.bedrooms || pq.beds || '—',
          features: pq.features || [],
          createdAt: lead.created_at,
          time: formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }),
          matched: !!prop,
          matchedPropertyName: prop ? (prop.title || prop.address || null) : null,
          matchedPropertyAddress: prop ? `${prop.address || ''}, ${prop.suburb || ''}`.replace(/^, |, $/, '') : null,
          userName: lead.user_name || 'Anonymous',
          userEmail: lead.user_email || '',
          userPhone: lead.user_phone || null,
        };
      });

      setLeads(mapped);
    } catch (err) {
      console.warn('[BuyerConcierge] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Realtime subscription for new leads
  useEffect(() => {
    if (!user) return;
    let agentId: string | null = null;

    const setup = async () => {
      const { data: agent } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) return;
      agentId = agent.id;

      const channel = supabase
        .channel('buyer_concierge_leads')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `agent_id=eq.${agentId}`,
        }, () => {
          // Refetch to get full joined data
          fetchLeads();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    let cleanup: (() => void) | undefined;
    setup().then(c => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [user, fetchLeads]);

  const hasContact = (l: ConciergeeLead) => !!(l.userEmail || l.userPhone);

  return (
    <div>
      <DashboardHeader
        title="AI Buyer Concierge"
        subtitle={`${leads.length} AI-matched buyer leads`}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* ── Left panel — lead list ── */}
          <div className={`${selectedId ? 'hidden lg:block lg:w-[380px]' : 'flex-1'} border-r border-border`}>
            <div className="p-4 space-y-2">
              {leads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles size={32} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No AI-matched buyers yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                    Leads will appear here automatically when buyers voice search for properties in your area.
                  </p>
                </div>
              )}

              {leads.map((lead) => {
                const u = URGENCY_CONFIG[lead.urgency];
                return (
                  <motion.button
                    key={lead.id}
                    onClick={() => setSelectedId(lead.id)}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left bg-card border rounded-xl p-4 transition-colors ${
                      selectedId === lead.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <ScoreRing score={lead.score} size={32} />
                      <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>
                        {u.icon} {u.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{lead.time}</span>
                    </div>
                    <p className="text-sm font-medium line-clamp-2 mb-1.5">&quot;{lead.transcript}&quot;</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} /> {lead.location}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 border-0 ${
                          lead.matched
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {lead.matched ? 'Matched' : 'Unmatched'}
                      </Badge>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Right panel — detail view ── */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 p-4 sm:p-6 space-y-5"
              >
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden flex items-center gap-1 text-xs text-muted-foreground mb-2"
                >
                  <X size={14} /> Back to leads
                </button>

                {/* AI Score */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                  <ScoreRing score={selected.score} size={56} />
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" /> AI Lead Score
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.score >= 70
                        ? `High-intent buyer — ${selected.score}% match confidence`
                        : selected.score >= 40
                        ? 'Moderate intent — follow up within 48 hours'
                        : 'Low urgency — add to nurture list'}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-blue-500/15 text-blue-600 border-0 text-[10px]">
                    AI Concierge
                  </Badge>
                </div>

                {/* What they're looking for */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">What the buyer is looking for</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Location</p>
                      <p className="text-xs font-medium flex items-center gap-1"><MapPin size={10} /> {selected.location}</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Budget</p>
                      <p className="text-xs font-medium flex items-center gap-1"><DollarSign size={10} /> {selected.budget}</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Property Type</p>
                      <p className="text-xs font-medium flex items-center gap-1"><Home size={10} /> {selected.propertyType}</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Bedrooms</p>
                      <p className="text-xs font-medium flex items-center gap-1"><BedDouble size={10} /> {selected.bedrooms}</p>
                    </div>
                  </div>
                  {selected.features.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.features.map((f: string) => (
                          <span key={f} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Transcript */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Sparkles size={14} /> Voice Transcript
                  </h3>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm leading-relaxed">
                      {selected.transcript.split(' ').map((word, i) => {
                        const isKw = selected.keywords.some(k =>
                          k.toLowerCase().includes(word.toLowerCase().replace(/[^a-z]/g, ''))
                        );
                        return (
                          <span key={i} className={isKw ? 'bg-primary/20 text-primary font-semibold px-0.5 rounded' : ''}>
                            {word}{' '}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                </div>

                {/* Matched Property */}
                {selected.matched && selected.matchedPropertyName && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mb-0.5">
                      <Sparkles size={10} /> Matched Property
                    </p>
                    <p className="text-sm font-semibold">{selected.matchedPropertyName}</p>
                    {selected.matchedPropertyAddress && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {selected.matchedPropertyAddress}
                      </p>
                    )}
                  </div>
                )}

                {/* Contact buttons */}
                {hasContact(selected) && (
                  <div className="flex flex-wrap gap-2">
                    {selected.userPhone && (
                      <>
                        <Button size="sm" className="gap-1.5 flex-1 min-w-[120px]" asChild>
                          <a href={`https://wa.me/${selected.userPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 flex-1 min-w-[120px]" asChild>
                          <a href={`tel:${selected.userPhone}`}>
                            <Phone size={14} /> Call Now
                          </a>
                        </Button>
                      </>
                    )}
                    {selected.userEmail && (
                      <Button size="sm" variant="outline" className="gap-1.5 flex-1 min-w-[120px]" asChild>
                        <a href={`mailto:${selected.userEmail}`}>
                          <Mail size={14} /> Email
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {!selected && !loading && (
              <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground text-sm">
                {leads.length > 0 ? 'Select a lead to view details' : 'AI-matched leads will appear here'}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default BuyerConciergePage;
