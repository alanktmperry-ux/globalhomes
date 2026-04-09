import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Mic, Flame, Thermometer, Snowflake, Phone, MessageSquare, Mail, X, MapPin, Shield, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDistanceToNow } from 'date-fns';

/* ── Types ───────────────────────────────────────────────────── */

interface VoiceLead {
  id: string;
  transcript: string;
  urgency: 'hot' | 'warm' | 'cold';
  score: number;
  time: string;
  createdAt: string;
  buyerLocation: string;
  preApproval: string;
  preferredContact: string;
  keywords: string[];
  matchedProperty: string;
  propertyId: string | null;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  leadId: string | null;
}

/* ── Helpers ─────────────────────────────────────────────────── */

function deriveUrgency(score: number | null, timeframe: string | null): 'hot' | 'warm' | 'cold' {
  if (score && score >= 70) return 'hot';
  if (score && score >= 40) return 'warm';
  if (timeframe === 'This week') return 'hot';
  if (timeframe === '1–3 months') return 'warm';
  return 'cold';
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
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  warm: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Cold' },
};

/* ── Component ───────────────────────────────────────────────── */

const VoiceLeadsPage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<VoiceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find((l) => l.id === selectedId);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!agent) { setLoading(false); return; }

      // Fetch leads with joined property info
      const { data: leadRows } = await supabase
        .from('leads')
        .select('*, properties(title, address, suburb)')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch recent voice searches (unactioned queries that haven't become leads yet)
      const { data: voiceRows } = await supabase
        .from('voice_searches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Build voice lead objects from leads table
      const voiceLeads: VoiceLead[] = (leadRows || []).map((lead: any) => {
        const ctx = lead.search_context as Record<string, any> | null;
        const transcript = lead.message || '';
        const prop = lead.properties as any;

        return {
          id: `lead-${lead.id}`,
          leadId: lead.id,
          transcript,
          urgency: deriveUrgency(lead.score, lead.timeframe),
          score: lead.score || 30,
          time: formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }),
          createdAt: lead.created_at,
          buyerLocation: ctx?.currentQuery || lead.timeframe || 'Unknown',
          preApproval: lead.pre_approval_status === 'approved' ? 'Pre-approved'
            : lead.pre_approval_status === 'in_progress' ? 'In progress'
            : 'Not started',
          preferredContact: lead.preferred_contact || 'email',
          keywords: extractKeywords(transcript),
          matchedProperty: prop ? `${prop.address || prop.title}, ${prop.suburb}` : 'Unmatched',
          propertyId: lead.property_id,
          userName: lead.user_name,
          userEmail: lead.user_email,
          userPhone: lead.user_phone,
        };
      });

      // Add voice searches that don't have a matching lead
      const existingTranscripts = new Set(voiceLeads.map(l => l.transcript.toLowerCase().trim()));
      const orphanVoice: VoiceLead[] = (voiceRows || [])
        .filter((vs: any) => !existingTranscripts.has((vs.transcript || '').toLowerCase().trim()))
        .map((vs: any) => {
          const parsed = vs.parsed_query as Record<string, any> | null;
          const loc = vs.user_location as Record<string, any> | null;

          return {
            id: `voice-${vs.id}`,
            leadId: null as string | null,
            transcript: vs.transcript || '',
            urgency: 'cold' as const,
            score: 20,
            time: formatDistanceToNow(new Date(vs.created_at), { addSuffix: true }),
            createdAt: vs.created_at,
            buyerLocation: loc?.city || loc?.suburb || parsed?.location || 'Unknown',
            preApproval: 'Not started',
            preferredContact: 'call',
            keywords: extractKeywords(vs.transcript || ''),
            matchedProperty: parsed?.location || 'No match',
            propertyId: null as string | null,
            userName: 'Voice Searcher',
            userEmail: '',
            userPhone: null as string | null,
          };
        });

      setLeads([...voiceLeads, ...orphanVoice]);
    } catch (err) {
      console.warn('[VoiceLeads] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  return (
    <div>
      <DashboardHeader title="Voice Leads" subtitle={`${leads.length} inquiries from voice searches`} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row">
        {/* Lead list */}
        <div className={`${selectedId ? 'hidden lg:block lg:w-[380px]' : 'flex-1'} border-r border-border`}>
          <div className="p-4 space-y-2">
            {leads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mic size={32} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No voice leads yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
                  When buyers use voice search on your listings, their inquiries will appear here with AI-scored urgency.
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
                    <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>
                      {u.icon} {u.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{lead.time}</span>
                    <span className="ml-auto text-xs font-bold text-primary">{lead.score}%</span>
                  </div>
                  <p className="text-sm font-medium line-clamp-2 mb-1">&quot;{lead.transcript}&quot;</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} /> {lead.buyerLocation}
                    </p>
                    {lead.userName && lead.userName !== 'Voice Searcher' && (
                      <span className="text-[10px] text-foreground font-medium">{lead.userName}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
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
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="4"
                      strokeDasharray={`${(selected.score / 100) * 150.8} 150.8`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold">
                    {selected.score}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <Sparkles size={14} className="text-primary" /> AI Lead Score
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.score >= 80
                      ? `This lead is ${selected.score}% likely to transact within 14 days`
                      : selected.score >= 50
                      ? 'Moderate intent — follow up within 48 hours'
                      : 'Low urgency — add to nurture list'}
                  </p>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Mic size={14} /> Voice Transcript
                </h3>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-sm leading-relaxed">
                    {selected.transcript.split(' ').map((word, i) => {
                      const isKeyword = selected.keywords.some((k) =>
                        k.toLowerCase().includes(word.toLowerCase().replace(/[^a-z]/g, ''))
                      );
                      return (
                        <span key={i} className={isKeyword ? 'bg-primary/20 text-primary font-semibold px-0.5 rounded' : ''}>
                          {word}{' '}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>

              {/* Buyer Profile */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Buyer Profile</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Name</p>
                    <p className="text-xs font-medium">{selected.userName}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Location</p>
                    <p className="text-xs font-medium flex items-center gap-1"><MapPin size={10} /> {selected.buyerLocation}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Pre-Approval</p>
                    <p className="text-xs font-medium flex items-center gap-1"><Shield size={10} /> {selected.preApproval}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Preferred Contact</p>
                    <p className="text-xs font-medium capitalize">{selected.preferredContact}</p>
                  </div>
                </div>
                {selected.keywords.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Keywords Detected</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.keywords.map((k) => (
                        <span key={k} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.matchedProperty && selected.matchedProperty !== 'Unmatched' && selected.matchedProperty !== 'No match' && (
                  <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                      <Sparkles size={10} /> Matched: {selected.matchedProperty}
                    </p>
                  </div>
                )}
              </div>

              {/* Contact buttons */}
              {selected.userName !== 'Voice Searcher' && (
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
              {leads.length > 0 ? 'Select a lead to view details' : 'Voice leads will appear here'}
            </div>
          )}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
};

export default VoiceLeadsPage;
