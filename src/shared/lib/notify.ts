// Central client helper — replaces direct supabase.from('notifications').insert() calls.
// Routes through the dispatch-notification edge function which respects user prefs,
// quiet hours, mute, and frequency.
import { supabase } from '@/integrations/supabase/client';

export type NotifyEventKey =
  | 'new_hot_lead'
  | 'lead_going_cold'
  | 'buyer_match'
  | 'co_broke_request'
  | 'listing_approved'
  | 'listing_rejected'
  | 'inbound_message'
  | 'template_suggested'
  | 'mention'
  | 'agent_approved'
  | 'cross_agent_dup_match'
  | 'reports_weekly_digest'
  | 'reputation_change'
  | 'automation_hot_lead_new'
  | 'automation_lead_going_cold'
  | 'automation_under_offer_stale'
  | 'automation_inspection_followup';

export interface NotifyInput {
  user_id?: string;
  agent_id?: string;
  event_key: NotifyEventKey | string;
  title: string;
  message?: string;
  property_id?: string | null;
  lead_id?: string | null;
  type?: string; // legacy notifications.type if different from event_key
  payload?: Record<string, unknown>;
}

export async function dispatchNotification(input: NotifyInput): Promise<void> {
  try {
    await supabase.functions.invoke('dispatch-notification', { body: input });
  } catch (err) {
    console.error('[dispatchNotification] failed', err);
  }
}
