import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, Mail, Phone, Clock, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, MessageSquare, Send, CheckCircle2,
  AlertTriangle, Zap, UserCheck, UserX, Filter, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthProvider';

type LifecycleStage = 'all' | 'trial' | 'converted' | 'at_risk' | 'never_listed' | 'expiring';

interface AdoptionScore {
  score: number;
  hasListing: boolean;
  hasVoiceSearch: boolean;
  hasTrust: boolean;
  hasContacts: boolean;
  hasProfile: boolean;
}

interface Note {
  id: string;
  note: string;
  author_name: string;
  created_at: string;
}

interface AgentLifecycleRow {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  phone: string | null;
  created_at: string;
  is_subscribed: boolean;
  plan_type: string | null;
  lastLogin: string | null;
  daysSinceLogin: number;
  trialDaysLeft: number | null;
  adoption: AdoptionScore;
  activeListings: number;
  totalLeads: number;
  notes: Note[];
  lifecycleStage: string;
  leadSource: string | null;
}

const PLAN_LABEL: Record<string, string> = {
  solo: 'Solo $299',
  agency: 'Agency $899',
  agency_pro: 'Agency Pro $1,999',
  enterprise: 'Enterprise',
  demo: 'Trial',
};

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: 'Trial', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20' },
  converted: { label: 'Converted', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  at_risk: { label: 'At Risk', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
  never_listed: { label: 'Never Listed', color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-500/20' },
  expiring: { label: 'Expiring', color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/20' },
  churned: { label: 'Churned', color: 'text-muted-foreground', bg: 'bg-secondary border-border' },
};

function AdoptionBar({ adoption }: { adoption: AdoptionScore }) {
  const steps = [
    { key: 'hasProfile', label: 'Profile', done: adoption.hasProfile },
    { key: 'hasListing', label: 'Listed', done: adoption.hasListing },
    { key: 'hasVoiceSearch', label: 'Voice', done: adoption.hasVoiceSearch },
    { key: 'hasContacts', label: 'Contacts', done: adoption.hasContacts },
    { key: 'hasTrust', label: 'Trust', done: adoption.hasTrust },
  ];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium">Adoption</span>
        <span className={`text-[10px] font-bold ${adoption.score >= 70 ? 'text-emerald-500' : adoption.score >= 40 ? 'text-amber-500' : 'text-destructive'}`}>
          {adoption.score}%
        </span>
      </div>
      <div className="flex gap-0.5">
        {steps.map(s => (
          <div key={s.key} className={`h-1.5 flex-1 rounded-full ${s.done ? 'bg-emerald-500' : 'bg-border'}`} />
        ))}
      </div>
      <div className="flex gap-0.5">
        {steps.map(s => (
          <span key={s.key} className={`flex-1 text-center text-[8px] ${s.done ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.trial;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function AgentRow({ agent, onNoteAdded }: { agent: AgentLifecycleRow; onNoteAdded: (agentId: string, note: Note) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const daysColor = agent.daysSinceLogin > 30 ? 'text-destructive' : agent.daysSinceLogin > 14 ? 'text-amber-500' : 'text-muted-foreground';
  const trialUrgency = agent.trialDaysLeft !== null && agent.trialDaysLeft <= 7;

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const { data, error } = await supabase
        .from('agent_lifecycle_notes' as any)
        .insert({ agent_id: agent.id, note: noteText.trim(), author_name: 'Admin' })
        .select()
        .single();
      if (error) throw error;
      onNoteAdded(agent.id, data as unknown as Note);
      setNoteText('');
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {agent.name[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{agent.name}</span>
            <StageBadge stage={agent.lifecycleStage} />
            {agent.notes.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare size={10} /> {agent.notes.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{agent.email}</p>
          {agent.agency && <p className="text-[10px] text-muted-foreground/70 truncate">{agent.agency}</p>}
        </div>

        <div className="hidden md:block w-32 shrink-0">
          <AdoptionBar adoption={agent.adoption} />
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{agent.activeListings}</p>
            <p className="text-[9px] text-muted-foreground">listings</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{agent.totalLeads}</p>
            <p className="text-[9px] text-muted-foreground">leads</p>
          </div>
          <div className="text-center">
            <p className={`text-sm font-bold ${daysColor}`}>{agent.daysSinceLogin === 999 ? '—' : `${agent.daysSinceLogin}d`}</p>
            <p className="text-[9px] text-muted-foreground">last login</p>
          </div>
          {agent.trialDaysLeft !== null && (
            <div className="text-center">
              <p className={`text-sm font-bold ${trialUrgency ? 'text-destructive' : 'text-amber-500'}`}>{agent.trialDaysLeft}d</p>
              <p className="text-[9px] text-muted-foreground">trial left</p>
            </div>
          )}
        </div>

        <div className="hidden lg:block shrink-0">
          <Badge variant="secondary" className="text-[10px]">
            {PLAN_LABEL[agent.plan_type?.toLowerCase() || ''] || 'Trial'}
          </Badge>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-accent/5">
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${agent.email}?subject=How's your ListHQ experience going?`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium" onClick={e => e.stopPropagation()}>
              <Mail size={12} /> Email agent
            </a>
            {agent.phone && (
              <a href={`tel:${agent.phone}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors font-medium" onClick={e => e.stopPropagation()}>
                <Phone size={12} /> Call
              </a>
            )}
            {trialUrgency && (
              <a href={`mailto:${agent.email}?subject=Your ListHQ trial is ending soon&body=Hi ${agent.name.split(' ')[0]},%0A%0AYour 60-day free trial ends in ${agent.trialDaysLeft} days.%0A%0ATeam ListHQ`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium" onClick={e => e.stopPropagation()}>
                <AlertTriangle size={12} /> Trial expiry email
              </a>
            )}
            {!agent.adoption.hasListing && (
              <a href={`mailto:${agent.email}?subject=Let's get your first listing live&body=Hi ${agent.name.split(' ')[0]},%0A%0AYou're signed up but haven't listed yet. Can I help?%0A%0ATeam ListHQ`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors font-medium" onClick={e => e.stopPropagation()}>
                <Zap size={12} /> Activation email
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Profile', done: agent.adoption.hasProfile },
              { label: 'Listed', done: agent.adoption.hasListing },
              { label: 'Voice', done: agent.adoption.hasVoiceSearch },
              { label: 'Contacts', done: agent.adoption.hasContacts },
              { label: 'Trust', done: agent.adoption.hasTrust },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1">
                {s.done ? <CheckCircle2 size={12} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border border-border" />}
                <span className={`text-[11px] ${s.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
            <span>Joined: <strong className="text-foreground">{new Date(agent.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
            {agent.lastLogin && (
              <span>Last login: <strong className="text-foreground">{new Date(agent.lastLogin).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
            )}
            {agent.leadSource && (
              <span>Lead source: <strong className="text-foreground">{agent.leadSource}</strong></span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">BDM Notes</p>
            {agent.notes.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {agent.notes.map(n => (
                  <div key={n.id} className="bg-card border border-border rounded-lg px-3 py-2">
                    <p className="text-xs text-foreground">{n.note}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.author_name} · {new Date(n.created_at).toLocaleDateString('en-AU')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">No notes yet</p>
            )}
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note, call outcome, follow-up reminder..." className="text-xs min-h-[60px] resize-none flex-1" />
              <Button size="sm" onClick={saveNote} disabled={savingNote || !noteText.trim()} className="self-end gap-1.5 text-xs">
                <Send size={11} />
                {savingNote ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentLifecycle() {
  const [agents, setAgents] = useState<AgentLifecycleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<LifecycleStage>('all');
  const [sortBy, setSortBy] = useState<'joined' | 'login' | 'adoption' | 'trial'>('trial');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [agentsRes, propsRes, leadsRes, voiceRes, contactsRes, trustRes] = await Promise.all([
        supabase.from('agents').select('id, name, email, agency, phone, created_at, is_subscribed, onboarding_complete, lead_source, lifecycle_stage, agent_subscriptions(plan_type)'),
        supabase.from('properties').select('agent_id, is_active'),
        supabase.from('leads').select('agent_id'),
        supabase.from('voice_searches').select('agent_id').limit(5000),
        supabase.from('contacts').select('agent_id').limit(5000),
        supabase.from('trust_ledger_entries' as any).select('agent_id').limit(1000),
      ]);

      const notesRes = await supabase.from('agent_lifecycle_notes' as any).select('*').order('created_at', { ascending: false });

      const signInMap = new Map<string, string | null>();
      try {
        const { callAdminFunction } = await import('@/features/admin/lib/adminApi');
        const j = await callAdminFunction('list_users');
        (j?.users || []).forEach((u: any) => signInMap.set(u.id, u.last_sign_in_at || null));
      } catch {}

      const propMap = new Map<string, number>();
      (propsRes.data || []).forEach((p: any) => {
        if (p.is_active && p.agent_id) propMap.set(p.agent_id, (propMap.get(p.agent_id) || 0) + 1);
      });

      const leadMap = new Map<string, number>();
      (leadsRes.data || []).forEach((l: any) => {
        if (l.agent_id) leadMap.set(l.agent_id, (leadMap.get(l.agent_id) || 0) + 1);
      });

      const voiceSet = new Set((voiceRes.data || []).map((v: any) => v.agent_id).filter(Boolean));
      const contactSet = new Set((contactsRes.data || []).map((c: any) => c.agent_id).filter(Boolean));
      const trustSet = new Set((trustRes.data || []).map((t: any) => t.agent_id).filter(Boolean));

      const notesMap = new Map<string, Note[]>();
      ((notesRes.data || []) as any[]).forEach((n: any) => {
        const arr = notesMap.get(n.agent_id) || [];
        arr.push(n);
        notesMap.set(n.agent_id, arr);
      });

      const rows: AgentLifecycleRow[] = (agentsRes.data || []).map((a: any) => {
        const planType = a.agent_subscriptions?.plan_type || null;
        const lastLogin = signInMap.get(a.id) || null;
        const daysSinceLogin = lastLogin ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / 86400000) : 999;
        const trialEnd = new Date(new Date(a.created_at).getTime() + 60 * 86400000);
        const trialDaysLeft = !a.is_subscribed ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : null;
        const hasListing = (propMap.get(a.id) || 0) > 0;
        const hasVoiceSearch = voiceSet.has(a.id);
        const hasTrust = trustSet.has(a.id);
        const hasContacts = contactSet.has(a.id);
        const hasProfile = !!a.onboarding_complete;
        const adoptionPts = [hasProfile, hasListing, hasVoiceSearch, hasContacts, hasTrust];
        const score = Math.round((adoptionPts.filter(Boolean).length / adoptionPts.length) * 100);

        let lifecycleStage = a.lifecycle_stage || 'trial';
        if (a.is_subscribed) lifecycleStage = 'converted';
        else if (!hasListing) lifecycleStage = 'never_listed';
        else if (trialDaysLeft !== null && trialDaysLeft <= 7) lifecycleStage = 'expiring';
        else if (daysSinceLogin > 14) lifecycleStage = 'at_risk';

        return {
          id: a.id, name: a.name, email: a.email, agency: a.agency, phone: a.phone,
          created_at: a.created_at, is_subscribed: a.is_subscribed, plan_type: planType,
          lastLogin, daysSinceLogin, trialDaysLeft,
          adoption: { score, hasListing, hasVoiceSearch, hasTrust, hasContacts, hasProfile },
          activeListings: propMap.get(a.id) || 0, totalLeads: leadMap.get(a.id) || 0,
          notes: notesMap.get(a.id) || [], lifecycleStage, leadSource: a.lead_source,
        };
      });

      setAgents(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleNoteAdded = (agentId: string, note: Note) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, notes: [note, ...a.notes] } : a));
  };

  const filtered = agents.filter(a => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()) || (a.agency || '').toLowerCase().includes(search.toLowerCase());
    const matchesStage = stage === 'all' || (stage === 'trial' && !a.is_subscribed) || (stage === 'converted' && a.is_subscribed) || (stage === 'at_risk' && a.lifecycleStage === 'at_risk') || (stage === 'never_listed' && a.lifecycleStage === 'never_listed') || (stage === 'expiring' && a.lifecycleStage === 'expiring');
    return matchesSearch && matchesStage;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'joined') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'login') return a.daysSinceLogin - b.daysSinceLogin;
    if (sortBy === 'adoption') return b.adoption.score - a.adoption.score;
    if (sortBy === 'trial') { const aD = a.trialDaysLeft ?? 999; const bD = b.trialDaysLeft ?? 999; return aD - bD; }
    return 0;
  });

  const counts = {
    trial: agents.filter(a => !a.is_subscribed).length,
    converted: agents.filter(a => a.is_subscribed).length,
    at_risk: agents.filter(a => a.lifecycleStage === 'at_risk').length,
    never_listed: agents.filter(a => a.lifecycleStage === 'never_listed').length,
    expiring: agents.filter(a => a.lifecycleStage === 'expiring').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Agent Lifecycle</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{agents.length} agents · Track trial stages, adoption, and conversion</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all' as LifecycleStage, label: `All (${agents.length})` },
          { key: 'expiring' as LifecycleStage, label: `Expiring (${counts.expiring})` },
          { key: 'at_risk' as LifecycleStage, label: `At Risk (${counts.at_risk})` },
          { key: 'never_listed' as LifecycleStage, label: `Never Listed (${counts.never_listed})` },
          { key: 'trial' as LifecycleStage, label: `Trial (${counts.trial})` },
          { key: 'converted' as LifecycleStage, label: `Converted (${counts.converted})` },
        ]).map(f => (
          <button key={f.key} onClick={() => setStage(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${stage === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or agency…" className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="text-xs bg-card border border-border rounded-xl px-3 py-2 text-foreground outline-none">
          <option value="trial">Sort: Trial ending soonest</option>
          <option value="login">Sort: Last login</option>
          <option value="adoption">Sort: Adoption score</option>
          <option value="joined">Sort: Recently joined</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No agents match this filter.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(a => (
            <AgentRow key={a.id} agent={a} onNoteAdded={handleNoteAdded} />
          ))}
        </div>
      )}
    </div>
  );
}