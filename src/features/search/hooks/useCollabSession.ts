import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface CollabReaction {
  id: string;
  property_id: string;
  user_id: string;
  emoji: string;
}

export interface CollabView {
  property_id: string;
  user_id: string;
  viewed_at: string;
}

export interface CollabSession {
  id: string;
  created_by: string;
  search_query: string;
  filters: Record<string, any>;
  map_center_lat: number | null;
  map_center_lng: number | null;
  selected_property_id: string | null;
}

export function useCollabSession() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<CollabSession | null>(null);
  const [reactions, setReactions] = useState<CollabReaction[]>([]);
  const [partnerViews, setPartnerViews] = useState<CollabView[]>([]);
  const [isCollab, setIsCollab] = useState(false);
  const trackedViews = useRef(new Set<string>());

  // Check URL for collab session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const collab = params.get('collab');
    const sid = params.get('sessionId');
    if (collab === 'true' && sid) {
      setSessionId(sid);
      setIsCollab(true);
    }
  }, []);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;
    const loadSession = async () => {
      const { data } = await supabase
        .from('collab_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      if (data) setSession(data as unknown as CollabSession);

      const { data: rxns } = await supabase
        .from('collab_reactions')
        .select('*')
        .eq('session_id', sessionId);
      if (rxns) setReactions(rxns as unknown as CollabReaction[]);

      const { data: views } = await supabase
        .from('collab_views')
        .select('*')
        .eq('session_id', sessionId);
      if (views) setPartnerViews(views as unknown as CollabView[]);
    };
    loadSession();
  }, [sessionId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`collab-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'collab_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new) setSession(payload.new as unknown as CollabSession);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'collab_reactions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const newRxn = payload.new as unknown as CollabReaction;
        setReactions(prev => [...prev.filter(r =>
          !(r.property_id === newRxn.property_id && r.user_id === newRxn.user_id && r.emoji === newRxn.emoji)
        ), newRxn]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'collab_reactions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const old = payload.old as unknown as CollabReaction;
        setReactions(prev => prev.filter(r => r.id !== old.id));
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'collab_views',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const newView = payload.new as unknown as CollabView;
        setPartnerViews(prev => [...prev, newView]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Create a new collab session
  const createSession = useCallback(async (opts: {
    query: string;
    filters: Record<string, any>;
    center?: { lat: number; lng: number };
  }) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to share searches.', variant: 'destructive' });
      return null;
    }
    const { data, error } = await supabase
      .from('collab_sessions')
      .insert({
        created_by: user.id,
        search_query: opts.query,
        filters: opts.filters as any,
        map_center_lat: opts.center?.lat ?? null,
        map_center_lng: opts.center?.lng ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      toast({ title: 'Error', description: 'Could not create shared session.', variant: 'destructive' });
      return null;
    }

    const sid = data.id;
    setSessionId(sid);
    setIsCollab(true);

    const url = `${window.location.origin}/?collab=true&sessionId=${sid}`;
    await navigator.clipboard.writeText(url);
    toast({ title: '🔗 Link copied!', description: 'Share this link with your partner to browse together.' });
    return url;
  }, [user, toast]);

  // Toggle a reaction on a property
  const toggleReaction = useCallback(async (propertyId: string, emoji: string) => {
    if (!user || !sessionId) return;

    const existing = reactions.find(
      r => r.property_id === propertyId && r.user_id === user.id && r.emoji === emoji
    );

    if (existing) {
      await supabase.from('collab_reactions').delete().eq('id', existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('collab_reactions')
        .insert({ session_id: sessionId, property_id: propertyId, user_id: user.id, emoji })
        .select()
        .single();
      if (data) setReactions(prev => [...prev, data as unknown as CollabReaction]);
    }
  }, [user, sessionId, reactions]);

  // Track a property view in the session
  const trackView = useCallback(async (propertyId: string) => {
    if (!user || !sessionId) return;
    const key = `${propertyId}-${user.id}`;
    if (trackedViews.current.has(key)) return;
    trackedViews.current.add(key);

    await supabase.from('collab_views').insert({
      session_id: sessionId,
      property_id: propertyId,
      user_id: user.id,
    });
  }, [user, sessionId]);

  // Update selected property in session (syncs to partner)
  const syncSelectedProperty = useCallback(async (propertyId: string | null) => {
    if (!user || !sessionId) return;
    await supabase
      .from('collab_sessions')
      .update({ selected_property_id: propertyId, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }, [user, sessionId]);

  // Update map center in session
  const syncMapCenter = useCallback(async (lat: number, lng: number) => {
    if (!user || !sessionId) return;
    await supabase
      .from('collab_sessions')
      .update({ map_center_lat: lat, map_center_lng: lng, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }, [user, sessionId]);

  // Get reactions for a specific property
  const getPropertyReactions = useCallback((propertyId: string) => {
    return reactions.filter(r => r.property_id === propertyId);
  }, [reactions]);

  // Check if partner has viewed a property
  const hasPartnerViewed = useCallback((propertyId: string) => {
    if (!user) return false;
    return partnerViews.some(v => v.property_id === propertyId && v.user_id !== user.id);
  }, [user, partnerViews]);

  return {
    isCollab,
    sessionId,
    session,
    createSession,
    toggleReaction,
    trackView,
    syncSelectedProperty,
    syncMapCenter,
    getPropertyReactions,
    hasPartnerViewed,
    reactions,
    partnerViews,
  };
}
