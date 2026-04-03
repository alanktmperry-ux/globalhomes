import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bot, MapPin, DollarSign, BedDouble, Clock, AlertCircle, Sparkles, Archive, Mail, Phone, Home, ExternalLink, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConciergeLead {
  id: string;
  agent_id: string;
  message: string | null;
  score: number | null;
  status: string | null;
  source: string | null;
  read: boolean | null;
  created_at: string;
  search_context: Record<string, any> | null;
  user_email?: string | null;
  archived_at?: string | null;
  properties?: {
    title: string | null;
    address: string | null;
    suburb: string | null;
  } | null;
}

const BuyerConciergePage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<ConciergeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ConciergeLead | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'viewed'>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [archiving, setArchiving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: agent, error: agentErr } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (agentErr) {
        setError(`Agent lookup error: ${agentErr.message}`);
        setLoading(false);
        return;
      }

      if (!agent) {
        setError('No agent profile found for your account.');
        setLoading(false);
        return;
      }

      setAgentId(agent.id);

      const { data: rows, error: leadsErr } = await supabase
        .from('leads')
        .select('*, properties(title, address, suburb)')
        .eq('agent_id', agent.id)
        .eq('source', 'ai_buyer_concierge')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (leadsErr) {
        setError(`Failed to load leads: ${leadsErr.message}`);
        setLoading(false);
        return;
      }

      setLeads((rows || []) as ConciergeLead[]);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Auto-open lead from URL param (e.g. from notification click)
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (leadId && leads.length > 0) {
      const match = leads.find((l) => l.id === leadId);
      if (match) {
        setSelectedLead(match);
      }
    }
  }, [leads, searchParams]);

  // Realtime subscription
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel('ai_concierge_leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const newLead = payload.new as ConciergeLead;
          if (newLead.source === 'ai_buyer_concierge') {
            setLeads((prev) => [newLead, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const markAsRead = async (leadId: string) => {
    await supabase
      .from('leads')
      .update({ read: true, status: 'viewed' })
      .eq('id', leadId);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, read: true, status: 'viewed' } : l
      )
    );
  };

  const archiveLead = async (leadId: string) => {
    if (!confirm('Archive this lead? It will be hidden from your dashboard.')) return;
    setArchiving(true);
    const { error } = await supabase
      .from('leads')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) {
      console.error('Archive failed:', error);
      alert('Failed to archive lead: ' + error.message);
      setArchiving(false);
      return;
    }
    await supabase.from('notifications').delete().eq('lead_id', leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLead(null);
    setArchiving(false);
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Permanently delete this lead? This cannot be undone.')) return;
    setArchiving(true);
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);
    if (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete lead: ' + error.message);
      setArchiving(false);
      return;
    }
    await supabase.from('notifications').delete().eq('lead_id', leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLead(null);
    setArchiving(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const filteredLeads = leads
    .filter((lead) => {
      if (filter === 'new') return !lead.read;
      if (filter === 'viewed') return !!lead.read;
      return true;
    })
    .filter((lead) => (lead.score ?? 0) >= minScore);

  const getMatchedSuburb = (lead: ConciergeLead): string => {
    const ctx = lead.search_context || {};
    return ctx.matched_suburb || ctx.parsed_query?.location || ctx.parsed_query?.suburb || '';
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (!price) return '';
    if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
    return `$${(price / 1_000).toFixed(0)}K`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading AI-matched leads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-destructive shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-sm">Could not load leads</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Check the browser console for details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header + Filter */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold">AI Buyer Concierge</h1>
          <p className="text-xs text-muted-foreground">
            Buyers actively searching for properties like yours
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
          {minScore > 0 ? ` · Score ${minScore}+` : ''}
        </Badge>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="new">
            New ({leads.filter(l => !l.read).length})
          </TabsTrigger>
          <TabsTrigger value="viewed">
            Viewed ({leads.filter(l => !!l.read).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Score filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Min Score:</span>
        {[
          { label: 'Any', value: 0 },
          { label: '30+', value: 30 },
          { label: '50+', value: 50 },
          { label: '70+', value: 70 },
          { label: '80+', value: 80 },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setMinScore(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              minScore === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No AI-matched buyers yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                When buyers search for properties matching yours, they'll appear here automatically.
                Make sure your listings are active with suburb, state, and price set.
              </p>
              {agentId && (
                <p className="text-[10px] text-muted-foreground/40 mt-4 font-mono">
                  Agent ID: {agentId}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {leads.length > 0 && filteredLeads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <p className="text-sm">No leads match this filter.</p>
          {minScore > 0 && (
            <button
              className="mt-2 text-xs text-primary underline"
              onClick={() => setMinScore(0)}
            >
              Clear score filter
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-1 py-2 bg-muted/50 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground font-medium ml-1">
            {selectedIds.size} selected
          </span>
          <button
            className="text-xs underline text-muted-foreground hover:text-foreground"
            onClick={selectAll}
          >
            Select all {filteredLeads.length}
          </button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            disabled={archiving}
            onClick={async () => {
              if (!confirm(`Archive ${selectedIds.size} leads?`)) return;
              setArchiving(true);
              await supabase
                .from('leads')
                .update({ archived_at: new Date().toISOString() })
                .in('id', Array.from(selectedIds));
              await supabase.from('notifications').delete().in('lead_id', Array.from(selectedIds));
              setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
              clearSelection();
              setArchiving(false);
            }}
            className="flex items-center gap-1"
          >
            <Archive className="h-3 w-3" />
            Archive selected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={archiving}
            onClick={async () => {
              if (!confirm(`Permanently delete ${selectedIds.size} leads? This cannot be undone.`)) return;
              setArchiving(true);
              await supabase
                .from('leads')
                .delete()
                .in('id', Array.from(selectedIds));
              await supabase.from('notifications').delete().in('lead_id', Array.from(selectedIds));
              setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
              clearSelection();
              setArchiving(false);
            }}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Delete selected
          </Button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={clearSelection}
          >
            ✕
          </button>
        </div>
      )}

      {/* Lead cards */}
      <div className="space-y-3">
        {filteredLeads.map((lead) => {
          const ctx = lead.search_context || {};
          const matchedSuburb = getMatchedSuburb(lead);
          const priceMin = ctx.price_min;
          const priceMax = ctx.price_max;
          const bedsMin = ctx.bedrooms_min;
          const score = lead.score || 0;

          return (
            <Card
              key={lead.id}
              className={`cursor-pointer transition-colors hover:border-primary/30 ${
                !lead.read ? 'border-primary/40 bg-primary/5' : ''
              }`}
              onClick={() => {
                markAsRead(lead.id);
                setSelectedLead(lead);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer shrink-0"
                  />
                  <p className="text-sm font-medium leading-snug flex-1">
                    "{lead.message || 'No transcript'}"
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!lead.read && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-5">
                        New
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${
                        score >= 70
                          ? 'border-green-500/50 text-green-600 dark:text-green-400'
                          : score >= 50
                          ? 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      Score: {score}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {matchedSuburb && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {matchedSuburb}
                    </span>
                  )}
                  {(priceMin || priceMax) && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      {priceMin && priceMax
                        ? `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`
                        : priceMax
                        ? `Up to ${formatPrice(priceMax)}`
                        : `From ${formatPrice(priceMin)}`}
                    </span>
                  )}
                  {bedsMin && (
                    <span className="flex items-center gap-1">
                      <BedDouble size={12} />
                      {bedsMin}+ beds
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
        <SheetContent className="overflow-y-auto">
          {selectedLead && (() => {
            const ctx = selectedLead.search_context || {};
            const matchedSuburb = getMatchedSuburb(selectedLead);
            const priceMin = ctx.price_min;
            const priceMax = ctx.price_max;
            const bedsMin = ctx.bedrooms_min;
            const propType = ctx.property_type || ctx.parsed_query?.property_type || null;
            const prop = selectedLead.properties;
            const score = selectedLead.score || 0;
            const email = selectedLead.user_email && !selectedLead.user_email.includes('@listhq.local')
              ? selectedLead.user_email : null;

            return (
              <>
                <SheetHeader>
                  <SheetTitle>Lead Detail</SheetTitle>
                </SheetHeader>

                {/* Score */}
                <div className="flex items-center gap-2 mt-4">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      score >= 70
                        ? 'border-green-500/50 text-green-600'
                        : score >= 50
                        ? 'border-yellow-500/50 text-yellow-600'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    Score: {score}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Transcript */}
                <div className="mt-4 rounded-lg bg-muted/50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Buyer searched for
                  </p>
                  <p className="text-sm font-medium">
                    "{selectedLead.message || 'No transcript'}"
                  </p>
                </div>

                <Separator className="my-4" />

                {/* What they want */}
                <div className="space-y-3">
                  {matchedSuburb && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Location</p>
                      <p className="text-sm flex items-center gap-1.5 mt-0.5">
                        <MapPin size={14} className="text-muted-foreground" /> {matchedSuburb}
                      </p>
                    </div>
                  )}
                  {(priceMin || priceMax) && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget</p>
                      <p className="text-sm flex items-center gap-1.5 mt-0.5">
                        <DollarSign size={14} className="text-muted-foreground" />
                        {priceMin && priceMax
                          ? `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`
                          : priceMax ? `Up to ${formatPrice(priceMax)}`
                          : `From ${formatPrice(priceMin)}`}
                      </p>
                    </div>
                  )}
                  {bedsMin && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Bedrooms</p>
                      <p className="text-sm flex items-center gap-1.5 mt-0.5">
                        <BedDouble size={14} className="text-muted-foreground" /> {bedsMin}+ beds
                      </p>
                    </div>
                  )}
                  {propType && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Type</p>
                      <p className="text-sm flex items-center gap-1.5 mt-0.5">
                        <Home size={14} className="text-muted-foreground" /> {propType}
                      </p>
                    </div>
                  )}
                </div>

                {/* Matched property */}
                {prop && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        Matched your listing
                      </p>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-medium">{prop.title || prop.address}</p>
                        {prop.suburb && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <MapPin size={10} className="inline mr-1" /> {prop.address}, {prop.suburb}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Contact */}
                {email && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                        Contact buyer
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${email}`}>
                          <Mail size={14} /> {email}
                        </a>
                      </Button>
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Archive */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveLead(selectedLead.id)}
                    disabled={archiving}
                    className="flex items-center gap-1"
                  >
                    <Archive className="h-3 w-3" />
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteLead(selectedLead.id)}
                    disabled={archiving}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BuyerConciergePage;
