import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { logAction } from '@/shared/lib/auditLog';

export interface Contact {
  id: string;
  agency_id: string | null;
  created_by: string;
  contact_type: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  avatar_url: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  preferred_suburbs: string[];
  budget_min: number | null;
  budget_max: number | null;
  preferred_beds: number | null;
  preferred_baths: number | null;
  preferred_property_types: string[];
  property_address: string | null;
  property_type: string | null;
  estimated_value: number | null;
  buyer_pipeline_stage: string;
  seller_pipeline_stage: string;
  ranking: string;
  assigned_agent_id: string | null;
  notes: string | null;
  source: string | null;
  tags: string[];
  preferred_language: string | null;
  communication_preferences: { channel: string; handle: string; is_primary: boolean }[];
  last_contacted_at: string | null;
  next_action_due_at: string | null;
  next_action_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined agent data (when isPrincipal)
  assigned_agent?: { name: string; avatar_url: string | null } | null;
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  user_id: string;
  activity_type: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

const PAGE_SIZE = 50;

export function useContacts() {
  const { user, isPrincipal, isAdmin, agencyId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!user) return;
    setLoading(true);

    const from = targetPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if ((isPrincipal || isAdmin) && agencyId) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, agents:assigned_agent_id(name, avatar_url)')
        .eq('agency_id', agencyId)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        const mapped = data.map((d: any) => ({
          ...d,
          assigned_agent: d.agents || null,
          agents: undefined,
        })) as unknown as Contact[];
        setContacts(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(mapped.length === PAGE_SIZE);
      }
    } else {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        const mapped = data as unknown as Contact[];
        setContacts(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(mapped.length === PAGE_SIZE);
      }
    }
    setLoading(false);
  }, [user, isPrincipal, isAdmin, agencyId]);

  const fetchContacts = useCallback(async () => {
    setPage(0);
    await fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    await fetchPage(next, true);
  }, [hasMore, loading, page, fetchPage]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        fetchContacts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchContacts]);

  const getAgentContext = async () => {
    if (!user) return { agentId: null, agencyId: null };
    const { data } = await supabase.from('agents').select('id, agency_id').eq('user_id', user.id).maybeSingle();
    return { agentId: data?.id || null, agencyId: data?.agency_id || null };
  };

  const createContact = async (contact: Partial<Contact>) => {
    if (!user) throw new Error('You must be logged in to create a contact.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        throw new Error('Your session has expired. Please log out and log back in.');
      }
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...contact, created_by: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error('[useContacts] Insert error:', error);
      if (error.code === '42501') {
        throw new Error('Permission denied. Your session may have expired — please log out and log back in.');
      }
      throw error;
    }

    // Audit log
    const ctx = await getAgentContext();
    logAction({
      agencyId: ctx.agencyId,
      agentId: ctx.agentId,
      userId: user.id,
      actionType: 'created',
      entityType: 'contact',
      entityId: data?.id,
      description: `Created contact ${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    });

    return data;
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const { error } = await supabase
      .from('contacts')
      .update(updates as any)
      .eq('id', id);
    if (error) throw error;

    if (user) {
      const ctx = await getAgentContext();
      logAction({
        agencyId: ctx.agencyId,
        agentId: ctx.agentId,
        userId: user.id,
        actionType: 'updated',
        entityType: 'contact',
        entityId: id,
        description: `Updated contact`,
      });
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  };

  const addActivity = async (contactId: string, activityType: string, description: string) => {
    if (!user) return;
    await supabase.from('contact_activities').insert({
      contact_id: contactId,
      user_id: user.id,
      activity_type: activityType,
      description,
    } as any);
  };

  const getActivities = async (contactId: string): Promise<ContactActivity[]> => {
    const { data } = await supabase
      .from('contact_activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false }) as any;
    return data || [];
  };

  return { contacts, loading, hasMore, loadMore, fetchContacts, createContact, updateContact, deleteContact, addActivity, getActivities };
}
