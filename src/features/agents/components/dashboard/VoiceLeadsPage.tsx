import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthProvider';
import { Mic, Flame, Thermometer, Snowflake, Phone, MessageSquare, Mail, Play, X, MapPin, Shield, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DashboardHeader from './DashboardHeader';

const LEADS = [
  {
    id: '1', transcript: '3 bed house in Berwick with pool under $900k, need to move quickly, cash buyer',
    urgency: 'hot' as const, score: 92, time: '12 min ago', buyerLocation: 'Melbourne CBD',
    searchHistory: ['4 bed Berwick', '3 bed Narre Warren', 'Pool homes SE Melbourne'],
    preApproval: 'Pre-approved $950k', preferredContact: 'whatsapp',
    keywords: ['pool', 'cash buyer', 'move quickly'],
    matchedProperty: '42 Panorama Drive, Berwick',
  },
  {
    id: '2', transcript: 'Looking for investment property near train station, 2 bedroom apartment, good rental yield',
    urgency: 'warm' as const, score: 74, time: '1h ago', buyerLocation: 'Sydney (relocating)',
    searchHistory: ['Investment Melbourne', '2 bed near station'],
    preApproval: 'Pending', preferredContact: 'email',
    keywords: ['investment', 'train station', 'rental yield'],
    matchedProperty: '15 Station St, Narre Warren',
  },
  {
    id: '3', transcript: 'Land in Officer area, 600 square meters minimum, just browsing',
    urgency: 'cold' as const, score: 38, time: '3h ago', buyerLocation: 'Pakenham',
    searchHistory: ['Land Officer', 'Land Clyde North'],
    preApproval: 'Not started', preferredContact: 'call',
    keywords: ['land', '600sqm'],
    matchedProperty: 'Lot 12 Officer South Rd',
  },
];

const URGENCY = {
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  warm: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Cold' },
};

const VoiceLeadsPage = () => {
  const { isDemoMode } = useAuth();
  const leads = isDemoMode ? LEADS : [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find((l) => l.id === selectedId);

  return (
    <div>
      <DashboardHeader title="Voice Leads" subtitle={`${leads.length} inquiries from voice searches`} />

      <div className="flex flex-col lg:flex-row">
        {/* Lead list */}
        <div className={`${selectedId ? 'hidden lg:block lg:w-[380px]' : 'flex-1'} border-r border-border`}>
          <div className="p-4 space-y-2">
            {leads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mic size={32} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No voice leads yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Voice search inquiries will appear here</p>
              </div>
            )}
            {leads.map((lead) => {
              const u = URGENCY[lead.urgency];
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
                  <p className="text-sm font-medium line-clamp-2 mb-1">"{lead.transcript}"</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} /> {lead.buyerLocation} → {lead.matchedProperty}
                  </p>
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
              {/* Mobile back */}
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
                  <Button variant="outline" size="sm" className="mt-3 text-[10px] h-7 gap-1">
                    <Play size={10} /> Listen to Voice
                  </Button>
                </div>
              </div>

              {/* Buyer Profile */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Buyer Profile</h3>
                <div className="grid grid-cols-2 gap-2">
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
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Search History</p>
                    <p className="text-xs font-medium">{selected.searchHistory.length} searches</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Recent Searches</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.searchHistory.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-accent text-accent-foreground text-[10px] rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1.5 flex-1 min-w-[120px]">
                  <MessageSquare size={14} /> WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1 min-w-[120px]">
                  <Phone size={14} /> Call Now
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1 min-w-[120px]">
                  <Mail size={14} /> Email
                </Button>
              </div>

              {/* AI Response */}
              <Button variant="secondary" className="w-full gap-1.5">
                <Sparkles size={14} /> Generate AI Response
              </Button>
            </motion.div>
          )}

          {!selected && (
            <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Select a lead to view details
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VoiceLeadsPage;
