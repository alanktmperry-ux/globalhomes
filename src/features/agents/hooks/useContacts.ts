import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

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
  created_at: string;
  updated_at: string;
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

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) setContacts(data as unknown as Contact[]);
    setLoading(false);
  }, [user]);

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

  const createContact = async (contact: Partial<Contact>) => {
    if (!user) throw new Error('You must be logged in to create a contact.');

    // Verify we have an active Supabase session (JWT token)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Try refreshing the session
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
    return data;
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const { error } = await supabase
      .from('contacts')
      .update(updates as any)
      .eq('id', id);
    if (error) throw error;
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

  return { contacts, loading, fetchContacts, createContact, updateContact, deleteContact, addActivity, getActivities };
}
