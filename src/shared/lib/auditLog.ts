import { supabase } from '@/integrations/supabase/client';

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
      metadata: params.metadata || {},
    } as any);
  } catch (err) {
    console.error('[AuditLog] Failed to log action:', err);
  }
}
