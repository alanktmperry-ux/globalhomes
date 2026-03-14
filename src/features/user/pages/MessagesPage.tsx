import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, ArrowLeft, Clock, User, Mail, Phone, Building2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadMessage {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
  property_id: string;
  agent_id: string;
  user_id: string | null;
  property?: {
    title: string;
    address: string;
    suburb: string;
    image_url: string | null;
  };
  agent?: {
    name: string;
    avatar_url: string | null;
    agency: string | null;
  };
}

const MessagesPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadMessage | null>(null);
  const [isAgent, setIsAgent] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Determine if user is agent
  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsAgent(true);
          setAgentId(data.id);
        }
      });
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    if (isAgent && agentId) {
      // Agent view: show leads/enquiries received
      const { data } = await supabase
        .from('leads')
        .select('*, properties:property_id(title, address, suburb, image_url)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setLeads(data.map((d: any) => ({
          ...d,
          property: d.properties,
        })));
      }
    } else {
      // Buyer view: show enquiries sent
      const { data } = await supabase
        .from('leads')
        .select('*, properties:property_id(title, address, suburb, image_url), agents:agent_id(name, avatar_url, agency)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setLeads(data.map((d: any) => ({
          ...d,
          property: d.properties,
          agent: d.agents,
        })));
      }
    }
    setLoading(false);
  }, [user, isAgent, agentId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const filter = isAgent && agentId
      ? `agent_id=eq.${agentId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel('messages-leads')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter,
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAgent, agentId, fetchMessages]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1 className="font-display text-xl font-bold text-foreground">{t('nav.messages')}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle size={40} strokeWidth={1.2} className="mb-3" />
            <p className="text-sm">Sign in to view your messages</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {selectedLead ? (
            <button onClick={() => setSelectedLead(null)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <h1 className="font-display text-xl font-bold text-foreground">
            {selectedLead
              ? (isAgent ? selectedLead.user_name : selectedLead.agent?.name || 'Agent')
              : t('nav.messages')}
          </h1>
          {!selectedLead && leads.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {leads.length} conversation{leads.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-2">
        <AnimatePresence mode="wait">
          {selectedLead ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <MessageDetail lead={selectedLead} isAgent={isAgent} />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {loading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-secondary/50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MessageCircle size={40} strokeWidth={1.2} className="mb-3" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">
                    {isAgent ? 'Enquiries from buyers will appear here' : 'Contact an agent to start a conversation'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  {leads.map(lead => (
                    <MessageRow
                      key={lead.id}
                      lead={lead}
                      isAgent={isAgent}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

function MessageRow({ lead, isAgent, onClick }: { lead: LeadMessage; isAgent: boolean; onClick: () => void }) {
  const displayName = isAgent ? lead.user_name : (lead.agent?.name || 'Agent');
  const subtitle = lead.property?.title || lead.property?.address || 'Property enquiry';
  const preview = lead.message || 'No message';
  const isNew = lead.status === 'new';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-2xl hover:bg-secondary/70 transition-colors flex items-start gap-3 ${
        isNew ? 'bg-primary/5' : ''
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        {isAgent && lead.user_name ? (
          <span className="text-sm font-bold text-foreground">
            {lead.user_name.charAt(0).toUpperCase()}
          </span>
        ) : lead.agent?.avatar_url ? (
          <img src={lead.agent.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <User size={16} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isNew ? 'text-foreground' : 'text-foreground/80'}`}>
            {displayName}
          </span>
          {isNew && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{preview}</p>
      </div>
    </button>
  );
}

function MessageDetail({ lead, isAgent }: { lead: LeadMessage; isAgent: boolean }) {
  return (
    <div className="space-y-4 py-2">
      {/* Property card */}
      {lead.property && (
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-2xl">
          {lead.property.image_url ? (
            <img src={lead.property.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{lead.property.title}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.property.address}</p>
          </div>
        </div>
      )}

      {/* Contact info */}
      {isAgent && (
        <div className="space-y-2 p-3 bg-secondary/30 rounded-2xl">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Contact Details</p>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-muted-foreground shrink-0" />
            <span className="text-foreground">{lead.user_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-muted-foreground shrink-0" />
            <a href={`mailto:${lead.user_email}`} className="text-primary hover:underline truncate">{lead.user_email}</a>
          </div>
          {lead.user_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-muted-foreground shrink-0" />
              <a href={`tel:${lead.user_phone}`} className="text-primary hover:underline">{lead.user_phone}</a>
            </div>
          )}
        </div>
      )}

      {/* Agent info for buyers */}
      {!isAgent && lead.agent && (
        <div className="space-y-2 p-3 bg-secondary/30 rounded-2xl">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Agent</p>
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-muted-foreground shrink-0" />
            <span className="text-foreground">{lead.agent.name}</span>
          </div>
          {lead.agent.agency && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 size={14} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{lead.agent.agency}</span>
            </div>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium px-1">Message</p>
        <div className={`p-4 rounded-2xl ${isAgent ? 'bg-secondary' : 'bg-primary/10'}`}>
          <p className="text-sm text-foreground leading-relaxed">
            {lead.message || 'No message was included with this enquiry.'}
          </p>
          <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
            <Clock size={10} />
            <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 px-1">
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
          lead.status === 'new' ? 'bg-primary/10 text-primary' :
          lead.status === 'contacted' ? 'bg-green-500/10 text-green-600' :
          'bg-secondary text-muted-foreground'
        }`}>
          {lead.status === 'new' ? '● New' : lead.status === 'contacted' ? '✓ Contacted' : lead.status || 'Pending'}
        </span>
      </div>
    </div>
  );
}

export default MessagesPage;
