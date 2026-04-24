import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type {
  ContactSavedView,
  ContactFilters,
  ContactSort,
  ContactColumnKey,
} from '@/features/agents/components/dashboard/contacts/savedViews/types';

export function useContactSavedViews() {
  const { user, agencyId, isPrincipal, isAdmin } = useAuth();
  const [views, setViews] = useState<ContactSavedView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViews = useCallback(async () => {
    if (!user) {
      setViews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_saved_views')
      .select('*')
      .order('is_shared', { ascending: true })
      .order('name', { ascending: true });
    if (!error && data) setViews(data as unknown as ContactSavedView[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchViews(); }, [fetchViews]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('contact_saved_views-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_saved_views' }, () => {
        fetchViews();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchViews]);

  const createView = useCallback(async (input: {
    name: string;
    filters: ContactFilters;
    sort: ContactSort;
    columns: ContactColumnKey[];
    is_shared: boolean;
  }): Promise<ContactSavedView | null> => {
    if (!user || !agencyId) throw new Error('Must be in an agency to save a view.');
    const { data, error } = await supabase
      .from('contact_saved_views')
      .insert({
        owner_id: user.id,
        agency_id: agencyId,
        name: input.name,
        filters: input.filters as any,
        sort: input.sort as any,
        columns: input.columns as any,
        is_shared: input.is_shared,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ContactSavedView;
  }, [user, agencyId]);

  const updateView = useCallback(async (id: string, updates: Partial<Omit<ContactSavedView, 'id' | 'owner_id' | 'agency_id' | 'created_at' | 'updated_at'>>) => {
    const payload: Record<string, unknown> = { ...updates };
    if (updates.filters !== undefined) payload.filters = updates.filters as any;
    if (updates.sort !== undefined) payload.sort = updates.sort as any;
    if (updates.columns !== undefined) payload.columns = updates.columns as any;
    const { error } = await supabase
      .from('contact_saved_views')
      .update(payload as any)
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deleteView = useCallback(async (id: string) => {
    const { error } = await supabase.from('contact_saved_views').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const canEditView = useCallback((view: ContactSavedView): boolean => {
    if (!user) return false;
    if (view.owner_id === user.id) return true;
    if (view.is_shared && (isPrincipal || isAdmin)) return true;
    return false;
  }, [user, isPrincipal, isAdmin]);

  return { views, loading, fetchViews, createView, updateView, deleteView, canEditView };
}
