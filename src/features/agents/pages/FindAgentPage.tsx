import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BadgeCheck, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/shared/components/layout/BottomNav';

interface AgentRow {
  id: string;
  name: string;
  agency: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialization: string | null;
  service_areas: string[] | null;
  languages_spoken: string[] | null;
  years_experience: number | null;
  verification_badge_level: string | null;
  title_position: string | null;
  investment_niche: string | null;
  handles_trust_accounting: boolean | null;
}


function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function PillList({ items, max }: { items: string[]; max: number }) {
  const visible = items.slice(0, max);
  const extra = items.length - max;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(item => (
        <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {item}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          +{extra} more
        </span>
      )}
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function FindAgentPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [languageFilter, setLanguageFilter] = useState('any');
  const [specialisationFilter, setSpecialisationFilter] = useState('any');

  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, name, agency, avatar_url, bio, specialization, service_areas, languages_spoken, years_experience, verification_badge_level, title_position, investment_niche, handles_trust_accounting')
        .eq('is_subscribed', true);
      setAgents((data as AgentRow[]) || []);
      setLoading(false);
    };
    fetchAgents();
  }, []);

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    agents.forEach(a => a.languages_spoken?.forEach(l => langs.add(l)));
    return Array.from(langs).sort();
  }, [agents]);

  const allSpecialisations = useMemo(() => {
    const set = new Set<string>();
    agents.forEach(a => {
      if (!a.investment_niche) return;
      a.investment_niche.split(',').map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
    });
    return Array.from(set).sort();
  }, [agents]);

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return agents.filter(a => {
      if (languageFilter !== 'any' && !(a.languages_spoken || []).includes(languageFilter)) return false;
      if (!q) return true;
      if (a.name.toLowerCase().includes(q)) return true;
      if (a.agency?.toLowerCase().includes(q)) return true;
      if ((a.service_areas || []).some(s => s.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [agents, searchText, languageFilter]);

  const showBadge = (level: string | null) => level === 'license' || level === 'top_performer';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3 space-y-3">
          <h1 className="text-lg font-bold text-foreground">Find an agent</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search by name, suburb or agency..."
                className="pl-9 h-10 text-sm"
              />
            </div>
            {allLanguages.length > 0 && (
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[130px] h-10 text-sm">
                  <SelectValue placeholder="Any language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any language</SelectItem>
                  {allLanguages.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Agent list */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <AgentCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search size={40} strokeWidth={1.2} className="mb-3 text-border" />
            <p className="text-sm font-medium text-foreground mb-1">No agents found for your search</p>
            <p className="text-xs text-muted-foreground text-center max-w-[220px]">
              Try a different suburb or language.
            </p>
          </div>
        ) : (
          filtered.map(agent => (
            <div
              key={agent.id}
              className="rounded-xl border border-border bg-card p-4 space-y-2.5 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  {agent.avatar_url && <AvatarImage src={agent.avatar_url} alt={agent.name} />}
                  <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                    {getInitials(agent.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-foreground truncate">{agent.name}</span>
                    {showBadge(agent.verification_badge_level) && (
                      <BadgeCheck size={14} className="text-primary flex-shrink-0" />
                    )}
                  </div>
                  {agent.agency && (
                    <p className="text-xs text-muted-foreground truncate">{agent.agency}</p>
                  )}
                  {agent.title_position && agent.title_position !== 'Agent' && (
                    <p className="text-[11px] text-muted-foreground/70">{agent.title_position}</p>
                  )}
                </div>
              </div>

              {(agent.service_areas?.length ?? 0) > 0 && (
                <PillList items={agent.service_areas!} max={3} />
              )}

              {(agent.languages_spoken?.length ?? 0) > 0 && (
                <PillList items={agent.languages_spoken!} max={2} />
              )}

              {agent.years_experience != null && agent.years_experience > 0 && (
                <p className="text-xs text-muted-foreground">{agent.years_experience} years experience</p>
              )}

              <button
                onClick={() => navigate(`/agent/${agent.id}`)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80 transition-opacity mt-1"
              >
                View profile <ChevronRight size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
