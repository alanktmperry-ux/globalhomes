import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { extractMergeTags, type TemplateCategory, type TemplateChannel } from '../lib/mergeTags';

export interface MessageTemplate {
  id: string;
  agency_id: string;
  name: string;
  channel: TemplateChannel;
  category: TemplateCategory;
  body_by_language: Record<string, string>;
  subject_by_language: Record<string, string> | null;
  merge_tags: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateInput {
  name: string;
  channel: TemplateChannel;
  category: TemplateCategory;
  body_by_language: Record<string, string>;
  subject_by_language?: Record<string, string> | null;
  is_active?: boolean;
}

export function useMessageTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Resolve current user's agency_id from agents table
      const { data: agentRow } = await supabase
        .from('agents')
        .select('agency_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const aId = agentRow?.agency_id ?? null;
      setAgencyId(aId);

      if (!aId) {
        setTemplates([]);
        return;
      }

      const { data, error: qErr } = await supabase
        .from('message_templates')
        .select('*')
        .eq('agency_id', aId)
        .is('deleted_at', null)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (qErr) throw qErr;
      setTemplates((data ?? []) as unknown as MessageTemplate[]);
    } catch (e) {
      console.error('useMessageTemplates load error', e);
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: TemplateInput) => {
    if (!agencyId || !user) throw new Error('No agency context');
    const merge_tags = Array.from(new Set([
      ...extractMergeTags(input.body_by_language.en || ''),
      ...extractMergeTags(input.subject_by_language?.en || ''),
    ]));
    const { data, error: e } = await supabase
      .from('message_templates')
      .insert({
        agency_id: agencyId,
        name: input.name.trim(),
        channel: input.channel,
        category: input.category,
        body_by_language: input.body_by_language,
        subject_by_language: input.channel === 'email' ? (input.subject_by_language ?? {}) : null,
        merge_tags,
        is_active: input.is_active ?? true,
        created_by: user.id,
      })
      .select()
      .single();
    if (e) throw e;
    await load();
    return data as unknown as MessageTemplate;
  }, [agencyId, user, load]);

  const update = useCallback(async (id: string, patch: Partial<TemplateInput>) => {
    const updates: Record<string, unknown> = { ...patch };
    if (patch.body_by_language || patch.subject_by_language !== undefined) {
      const body = patch.body_by_language?.en ?? '';
      const subj = patch.subject_by_language?.en ?? '';
      updates.merge_tags = Array.from(new Set([...extractMergeTags(body), ...extractMergeTags(subj)]));
    }
    const { error: e } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', id);
    if (e) throw e;
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const { error: e } = await supabase
      .from('message_templates')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);
    if (e) throw e;
    await load();
  }, [load]);

  return { templates, loading, error, agencyId, reload: load, create, update, remove };
}

/**
 * Translate an English body (and optional subject) into the agent's three CRM
 * languages via the existing generate-translations edge function.
 */
export async function autoTranslateTemplate(opts: {
  body_en: string;
  subject_en?: string | null;
  target_languages?: string[];
}) {
  const { data, error } = await supabase.functions.invoke('generate-translations', {
    body: {
      type: 'translate_template',
      source_text: opts.body_en,
      source_subject: opts.subject_en ?? null,
      target_languages: opts.target_languages ?? ['zh_simplified', 'zh_traditional', 'vi'],
    },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as { bodies: Record<string, string>; subjects: Record<string, string> };
}
