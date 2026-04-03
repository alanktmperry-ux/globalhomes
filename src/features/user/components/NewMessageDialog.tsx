import { useState, useCallback, useEffect } from 'react';
import { Search, MessageCircle, Building2, User, X, Loader2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface AgentResult {
  id: string;
  user_id: string;
  name: string;
  agency: string | null;
  avatar_url: string | null;
}

interface SavedProperty {
  id: string;
  title: string;
  address: string;
  image_url: string | null;
  agent_id: string | null;
  agent_name: string | null;
  agent_user_id: string | null;
  agent_avatar: string | null;
}

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onConversationCreated: (convo: {
    id: string;
    other_user_name: string;
    other_user_avatar: string | null;
    other_user_id: string;
    property_id: string | null;
    property_title?: string;
    property_address?: string;
    property_image?: string | null;
  }) => void;
}

export function NewMessageDialog({ open, onOpenChange, userId, onConversationCreated }: NewMessageDialogProps) {
  const [tab, setTab] = useState<'agents' | 'properties'>('agents');
  const [query, setQuery] = useState('');
  const [agents, setAgents] = useState<AgentResult[]>([]);
  const [savedProps, setSavedProps] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  // Search agents by name
  useEffect(() => {
    if (!open) return;
    if (tab !== 'agents') return;

    const searchAgents = async () => {
      setLoading(true);
      let q = supabase
        .from('agents')
        .select('id, user_id, name, agency, avatar_url')
        .neq('user_id', userId)
        .order('name')
        .limit(20);

      if (query.trim().length > 0) {
        q = q.ilike('name', `%${query.trim()}%`);
      }

      const { data } = await q;
      setAgents((data as AgentResult[]) ?? []);
      setLoading(false);
    };

    const debounce = setTimeout(searchAgents, 250);
    return () => clearTimeout(debounce);
  }, [open, tab, query, userId]);

  // Fetch saved properties
  useEffect(() => {
    if (!open || tab !== 'properties') return;

    const fetchSaved = async () => {
      setLoading(true);
      const { data: savedRows } = await supabase
        .from('saved_properties')
        .select('property_id')
        .eq('user_id', userId)
        .limit(50);

      if (!savedRows || savedRows.length === 0) {
        setSavedProps([]);
        setLoading(false);
        return;
      }

      const ids = savedRows.map((r: any) => r.property_id);
      const { data: props } = await supabase
        .from('properties')
        .select('id, title, address, image_url, agent_id, agents(name, user_id, avatar_url)')
        .in('id', ids);

      const mapped: SavedProperty[] = (props ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        address: p.address,
        image_url: p.image_url,
        agent_id: p.agent_id,
        agent_name: p.agents?.name ?? null,
        agent_user_id: p.agents?.user_id ?? null,
        agent_avatar: p.agents?.avatar_url ?? null,
      }));

      setSavedProps(mapped);
      setLoading(false);
    };

    fetchSaved();
  }, [open, tab, userId]);

  const findOrCreateConversation = useCallback(
    async (otherUserId: string, propertyId: string | null, meta: {
      name: string;
      avatar: string | null;
      propTitle?: string;
      propAddress?: string;
      propImage?: string | null;
    }) => {
      if (!otherUserId) return;
      setCreating(otherUserId + (propertyId ?? ''));

      try {
        // Deterministic participant ordering
        const p1 = userId < otherUserId ? userId : otherUserId;
        const p2 = userId < otherUserId ? otherUserId : userId;

        // Check existing
        let q = supabase
          .from('conversations')
          .select('id')
          .eq('participant_1', p1)
          .eq('participant_2', p2);

        if (propertyId) {
          q = q.eq('property_id', propertyId);
        } else {
          q = q.is('property_id', null);
        }

        const { data: existing } = await q.maybeSingle();

        let convoId: string;

        if (existing) {
          convoId = existing.id;
        } else {
          const insertPayload: any = { participant_1: p1, participant_2: p2 };
          if (propertyId) insertPayload.property_id = propertyId;

          const { data: created, error } = await supabase
            .from('conversations')
            .insert(insertPayload)
            .select('id')
            .single();

          if (error || !created) {
            console.error('[NewMessageDialog] create conversation error:', error);
            return;
          }
          convoId = created.id;
        }

        onConversationCreated({
          id: convoId,
          other_user_name: meta.name,
          other_user_avatar: meta.avatar,
          other_user_id: otherUserId,
          property_id: propertyId,
          property_title: meta.propTitle,
          property_address: meta.propAddress,
          property_image: meta.propImage,
        });
        onOpenChange(false);
      } finally {
        setCreating(null);
      }
    },
    [userId, onConversationCreated, onOpenChange],
  );

  const handleSelectAgent = (agent: AgentResult) => {
    findOrCreateConversation(agent.user_id, null, {
      name: agent.name,
      avatar: agent.avatar_url,
    });
  };

  const handleSelectProperty = (prop: SavedProperty) => {
    if (!prop.agent_user_id) return;
    findOrCreateConversation(prop.agent_user_id, prop.id, {
      name: prop.agent_name ?? 'Agent',
      avatar: prop.agent_avatar,
      propTitle: prop.title,
      propAddress: prop.address,
      propImage: prop.image_url,
    });
  };

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setTab('agents');
      setAgents([]);
      setSavedProps([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-lg font-display">New Message</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border mt-3">
          <button
            onClick={() => { setTab('agents'); setQuery(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'agents'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User size={14} className="inline mr-1.5 -mt-0.5" />
            Find Agent
          </button>
          <button
            onClick={() => setTab('properties')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'properties'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 size={14} className="inline mr-1.5 -mt-0.5" />
            Saved Properties
          </button>
        </div>

        {/* Search (agents tab only) */}
        {tab === 'agents' && (
          <div className="px-4 pt-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agents by name..."
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="px-4 py-3 max-h-80 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : tab === 'agents' ? (
            agents.length === 0 ? (
              <div className="text-center py-10">
                <User size={28} strokeWidth={1.2} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {query ? 'No agents found' : 'Search for an agent to message'}
                </p>
              </div>
            ) : (
              agents.map((agent) => {
                const isCreating = creating === agent.user_id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    disabled={!!creating}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/70 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-foreground">{agent.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                      {agent.agency && <p className="text-xs text-muted-foreground truncate">{agent.agency}</p>}
                    </div>
                    {isCreating ? (
                      <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                    ) : (
                      <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })
            )
          ) : (
            savedProps.length === 0 ? (
              <div className="text-center py-10">
                <Building2 size={28} strokeWidth={1.2} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No saved properties</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Save a listing first to message its agent</p>
              </div>
            ) : (
              savedProps.map((prop) => {
                const isCreating = creating === (prop.agent_user_id ?? '') + prop.id;
                const disabled = !prop.agent_user_id || !!creating;
                return (
                  <button
                    key={prop.id}
                    onClick={() => handleSelectProperty(prop)}
                    disabled={disabled}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/70 transition-colors text-left disabled:opacity-50"
                  >
                    {prop.image_url ? (
                      <img src={prop.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{prop.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                      {prop.agent_name ? (
                        <p className="text-[10px] text-primary truncate mt-0.5">Agent: {prop.agent_name}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">No agent linked</p>
                      )}
                    </div>
                    {isCreating ? (
                      <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                    ) : (
                      <MessageCircle size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
