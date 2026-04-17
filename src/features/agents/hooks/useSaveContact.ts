import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';

interface SaveContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  property_id?: string | null;
}

/**
 * Save a lead as a Contact, deduped by (email, assigned_agent_id).
 * Tracks per-key saved state so callers can render a "Saved ✓" button.
 */
export function useSaveContact() {
  const { user } = useAuth();
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const isSaved = useCallback((key: string) => savedKeys.has(key), [savedKeys]);
  const isSaving = useCallback((key: string) => savingKey === key, [savingKey]);

  const saveContact = useCallback(async (key: string, input: SaveContactInput) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    if (!input.email) {
      toast.error('Email required to save contact');
      return;
    }
    setSavingKey(key);
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, agency_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check existing by email + assigned_agent_id
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', input.email)
        .eq('assigned_agent_id', agent?.id || '')
        .maybeSingle();

      if (!existing) {
        const [first, ...rest] = (input.name || '').trim().split(' ');
        const { error: insErr } = await supabase
          .from('contacts')
          .insert({
            first_name: first || 'Buyer',
            last_name: rest.join(' ') || null,
            email: input.email,
            phone: input.phone || null,
            contact_type: 'buyer',
            source: input.source,
            assigned_agent_id: agent?.id || null,
            agency_id: agent?.agency_id || null,
            created_by: user.id,
            buyer_pipeline_stage: 'new',
          } as any);
        if (insErr) throw insErr;
      }

      setSavedKeys(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      toast.success(existing ? 'Already in Contacts' : 'Saved to Contacts');
    } catch (e: any) {
      toast.error(`Save failed — ${e?.message || 'try again'}`);
    } finally {
      setSavingKey(null);
    }
  }, [user]);

  return { saveContact, isSaved, isSaving };
}
