import { supabase } from '@/integrations/supabase/client';

/**
 * Wraps an audit metadata object with consistent forensic fields:
 * - timestamp_utc: ISO timestamp at the moment the event was recorded
 * - session_id: stable per-tab UUID for correlating events in a session
 */
export function buildAuditMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...extra,
    timestamp_utc: new Date().toISOString(),
    session_id: (() => {
      try {
        let sid = sessionStorage.getItem('audit_session_id');
        if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem('audit_session_id', sid); }
        return sid;
      } catch { return null; }
    })(),
  };
}

interface AuditLogParams {
  agencyId: string | null;
  agentId: string | null;
  userId: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function logAction(params: AuditLogParams) {
  if (!params.agencyId) return; // only log for agency agents
  try {
    await supabase.from('audit_log').insert({
      agency_id: params.agencyId,
      agent_id: params.agentId,
      user_id: params.userId,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      description: params.description,
      metadata: buildAuditMeta(params.metadata || {}),
    } as any);
  } catch (err) {
    console.error('[AuditLog] Failed to log action:', err);
  }
}

