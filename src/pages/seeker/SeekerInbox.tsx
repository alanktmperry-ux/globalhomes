import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, X, Send, Inbox as InboxIcon, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface HaloResponse {
  id: string;
  halo_id: string;
  agent_id: string;
  body: string | null;
  suggested_property_ids: string[] | null;
  accepted: boolean | null;
  dismissed_by_seeker: boolean | null;
  viewed_by_seeker: boolean;
  created_at: string;
  unlocked_at: string;
  halo?: { suburbs: string[] | null; intent: string | null } | null;
  agent?: { full_name: string | null; agency_name: string | null; avatar_url: string | null } | null;
  properties?: Array<{ id: string; title: string | null; address: string | null; suburb: string | null; price: number | null }>;
  unread_count?: number;
}

interface HaloMessage {
  id: string;
  sender_type: 'seeker' | 'agent';
  sender_id: string;
  body: string;
  read_by_recipient: boolean;
  created_at: string;
}

const formatPrice = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt(min || max!);
};

export default function SeekerInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [responses, setResponses] = useState<HaloResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('response'));
  const [messages, setMessages] = useState<HaloMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadResponses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: halos } = await supabase
      .from('halos')
      .select('id, suburbs, intent')
      .eq('seeker_id', user.id);
    const haloIds = (halos || []).map((h) => h.id);
    if (haloIds.length === 0) {
      setResponses([]);
      setLoading(false);
      return;
    }
    const { data: resps } = await supabase
      .from('halo_responses')
      .select('id, halo_id, agent_id, body, suggested_property_ids, accepted, dismissed_by_seeker, viewed_by_seeker, created_at, unlocked_at')
      .in('halo_id', haloIds)
      .order('created_at', { ascending: false });

    const list = (resps || []) as HaloResponse[];
    const agentIds = Array.from(new Set(list.map((r) => r.agent_id)));
    const allPropertyIds = Array.from(
      new Set(list.flatMap((r) => r.suggested_property_ids || []))
    );

    const [{ data: agents }, { data: properties }, { data: unreadMsgs }] = await Promise.all([
      agentIds.length
        ? supabase.from('agents').select('user_id, full_name, agency_name, avatar_url').in('user_id', agentIds)
        : Promise.resolve({ data: [] as any[] }),
      allPropertyIds.length
        ? supabase.from('listings').select('id, title, address_line1, suburb, price_min, price_max').in('id', allPropertyIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('halo_messages')
        .select('halo_response_id')
        .eq('sender_type', 'agent')
        .eq('read_by_recipient', false)
        .in('halo_response_id', list.map((r) => r.id).length ? list.map((r) => r.id) : ['00000000-0000-0000-0000-000000000000']),
    ]);

    const agentMap = new Map((agents || []).map((a: any) => [a.user_id, a]));
    const propMap = new Map((properties || []).map((p: any) => [p.id, p]));
    const haloMap = new Map((halos || []).map((h: any) => [h.id, h]));
    const unreadMap = new Map<string, number>();
    (unreadMsgs || []).forEach((m: any) => {
      unreadMap.set(m.halo_response_id, (unreadMap.get(m.halo_response_id) || 0) + 1);
    });

    const enriched = list.map((r) => ({
      ...r,
      halo: haloMap.get(r.halo_id) || null,
      agent: agentMap.get(r.agent_id) || null,
      properties: (r.suggested_property_ids || [])
        .map((pid) => propMap.get(pid))
        .filter(Boolean) as HaloResponse['properties'],
      unread_count: unreadMap.get(r.id) || 0,
    }));

    setResponses(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  // Auto-select first response if none selected
  useEffect(() => {
    if (!selectedId && responses.length > 0) {
      setSelectedId(responses[0].id);
    }
  }, [responses, selectedId]);

  const selected = useMemo(
    () => responses.find((r) => r.id === selectedId) || null,
    [responses, selectedId]
  );

  // Load messages when selection changes; also mark response as viewed and incoming messages as read
  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('halo_messages')
        .select('id, sender_type, sender_id, body, read_by_recipient, created_at')
        .eq('halo_response_id', selected.id)
        .order('created_at', { ascending: true });
      if (!cancelled) setMessages((data || []) as HaloMessage[]);

      // Mark response as viewed
      if (!selected.viewed_by_seeker) {
        await supabase
          .from('halo_responses')
          .update({ viewed_by_seeker: true })
          .eq('id', selected.id);
      }
      // Mark agent messages as read
      await supabase
        .from('halo_messages')
        .update({ read_by_recipient: true })
        .eq('halo_response_id', selected.id)
        .eq('sender_type', 'agent')
        .eq('read_by_recipient', false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const handleSendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from('halo_messages')
      .insert({
        halo_response_id: selected.id,
        halo_id: selected.halo_id,
        sender_type: 'seeker',
        sender_id: user.id,
        body: reply.trim(),
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error('Could not send reply');
      return;
    }
    setMessages((prev) => [...prev, data as HaloMessage]);
    setReply('');
    toast.success('Reply sent');
  };

  const handleAccept = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('halo_responses')
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) return toast.error('Could not accept');
    toast.success('Marked as accepted — the agent will be notified');
    loadResponses();
  };

  const handleDismiss = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('halo_responses')
      .update({ dismissed_by_seeker: true, dismissed_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) return toast.error('Could not dismiss');
    toast.success('Response dismissed');
    setSelectedId(null);
    loadResponses();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="text-[#64748B]">Loading inbox…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate('/seeker/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#1E293B] mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <div className="flex items-center gap-3 mb-6">
          <InboxIcon className="h-6 w-6 text-[#1E3A5F]" />
          <h1 className="text-2xl font-semibold text-[#1E293B]">Inbox</h1>
          <Badge variant="secondary" className="ml-2">{responses.length}</Badge>
        </div>

        {responses.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-12 text-center shadow-sm">
            <InboxIcon className="h-12 w-12 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-[#1E293B] font-medium mb-1">No responses yet</p>
            <p className="text-[#64748B] text-sm">
              When agents respond to your Halos, their messages will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            {/* Response list */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
              <div className="divide-y divide-[#E2E8F0] max-h-[70vh] overflow-y-auto">
                {responses.map((r) => {
                  const isSelected = r.id === selectedId;
                  const unread = (r.unread_count || 0) > 0 || !r.viewed_by_seeker;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left px-4 py-3 min-h-[44px] hover:bg-[#F8FAFC] transition-colors ${
                        isSelected ? 'bg-[#EFF6FF]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-[#1E293B] truncate">
                          {r.agent?.full_name || 'Agent'}
                        </span>
                        {unread && (
                          <span className="h-2 w-2 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] truncate">
                        {r.agent?.agency_name || ''}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[#64748B]">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{(r.halo?.suburbs || []).slice(0, 2).join(', ')}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                      {r.accepted && (
                        <Badge className="mt-1 bg-[#059669] hover:bg-[#059669] text-white text-[10px]">Accepted</Badge>
                      )}
                      {r.dismissed_by_seeker && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">Dismissed</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail pane */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm">
              {!selected ? (
                <div className="p-12 text-center text-[#64748B]">Select a response to view details</div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="border-b border-[#E2E8F0] p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[#1E293B]">
                          {selected.agent?.full_name || 'Agent'}
                        </h2>
                        {selected.agent?.agency_name && (
                          <p className="text-sm text-[#64748B]">{selected.agent.agency_name}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-[#64748B]">
                          <MapPin className="h-3 w-3" />
                          {(selected.halo?.suburbs || []).join(', ')}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {!selected.accepted && !selected.dismissed_by_seeker && (
                          <>
                            <Button
                              onClick={handleAccept}
                              className="bg-[#059669] hover:bg-[#047857] text-white min-h-[44px]"
                              size="sm"
                            >
                              <Check className="h-4 w-4 mr-1" /> Accept
                            </Button>
                            <Button
                              onClick={handleDismiss}
                              variant="outline"
                              className="border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] min-h-[44px]"
                              size="sm"
                            >
                              <X className="h-4 w-4 mr-1" /> Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Initial agent message */}
                  {selected.body && (
                    <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <p className="text-xs text-[#64748B] mb-2 uppercase tracking-wide">Initial message</p>
                      <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{selected.body}</p>
                    </div>
                  )}

                  {/* Suggested properties */}
                  {selected.properties && selected.properties.length > 0 && (
                    <div className="p-4 sm:p-5 border-b border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-3 uppercase tracking-wide">Suggested properties</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selected.properties.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => navigate(`/property/${p.id}`)}
                            className="text-left border border-[#E2E8F0] rounded-lg p-3 hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <Home className="h-4 w-4 text-[#2563EB] mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#1E293B] truncate">
                                  {p.title || p.address_line1 || 'Property'}
                                </p>
                                <p className="text-xs text-[#64748B] truncate">{p.suburb}</p>
                                {formatPrice(p.price_min, p.price_max) && (
                                  <p className="text-xs text-[#1E3A5F] font-medium mt-1">
                                    {formatPrice(p.price_min, p.price_max)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation */}
                  <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[40vh]">
                    {messages.length === 0 ? (
                      <p className="text-sm text-[#94A3B8] text-center py-6">No messages yet — send the first reply</p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex ${m.sender_type === 'seeker' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                m.sender_type === 'seeker'
                                  ? 'bg-[#2563EB] text-white'
                                  : 'bg-[#F0F4F8] text-[#1E293B]'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.body}</p>
                              <p className={`text-[10px] mt-1 ${m.sender_type === 'seeker' ? 'text-white/70' : 'text-[#64748B]'}`}>
                                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reply box */}
                  {!selected.dismissed_by_seeker && (
                    <div className="border-t border-[#E2E8F0] p-4 sm:p-5">
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a reply…"
                        className="border-[#E2E8F0] focus-visible:ring-[#2563EB] mb-2 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSendReply}
                          disabled={!reply.trim() || sending}
                          className="bg-[#1E3A5F] hover:bg-[#172E4A] text-white min-h-[44px]"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sending ? 'Sending…' : 'Send reply'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
