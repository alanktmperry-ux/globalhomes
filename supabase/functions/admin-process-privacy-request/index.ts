import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Tables that hold user-owned data we will export and/or scrub on deletion.
// Keep this list conservative — over-exporting non-PII is fine, under-exporting PII is not.
const USER_TABLES = [
  'agents',
  'profiles',
  'properties',
  'tenancies',
  'support_tickets',
  'support_messages',
  'halo_credit_purchases',
  'agent_subscriptions',
  'saved_properties',
  'saved_searches',
  'contacts',
  'admin_audit_log',
] as const;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '').trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: userData } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) return json({ error: 'Unauthorized' }, 401);

    const { data: roleCheck } = await supabase
      .from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'admin').maybeSingle();
    if (!roleCheck) return json({ error: 'Forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const request_id = String(body.request_id || '');
    const action = String(body.action || ''); // 'fulfil_export' | 'fulfil_deletion' | 'reject'
    const notes = body.notes ? String(body.notes).slice(0, 2000) : null;

    if (!request_id) return json({ error: 'request_id required' }, 400);

    const { data: pr, error: prErr } = await supabase
      .from('privacy_requests').select('*').eq('id', request_id).maybeSingle();
    if (prErr || !pr) return json({ error: 'Privacy request not found' }, 404);

    if (action === 'reject') {
      await supabase.from('privacy_requests').update({
        status: 'rejected', notes, fulfilled_by: caller.id, fulfilled_at: new Date().toISOString(),
      }).eq('id', request_id);
      return json({ ok: true });
    }

    if (action === 'fulfil_export') {
      const exportData: Record<string, unknown> = { exported_at: new Date().toISOString(), email: pr.email, user_id: pr.user_id };
      const tablesData: Record<string, unknown[]> = {};

      if (pr.user_id) {
        for (const table of USER_TABLES) {
          try {
            // Try common owner columns
            const { data: byUserId } = await supabase.from(table).select('*').eq('user_id', pr.user_id);
            const { data: byOwnerId } = byUserId && byUserId.length
              ? { data: [] as unknown[] }
              : await supabase.from(table).select('*').eq('id', pr.user_id);
            tablesData[table] = [...(byUserId || []), ...(byOwnerId || [])];
          } catch (_e) { tablesData[table] = []; }
        }
      }
      exportData.tables = tablesData;

      const fileName = `privacy-export-${request_id}-${Date.now()}.json`;
      const bucket = 'privacy-exports';
      try { await supabase.storage.createBucket(bucket, { public: false }); } catch (_e) { /* exists */ }

      const { error: upErr } = await supabase.storage.from(bucket).upload(
        fileName,
        new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }),
        { upsert: true, contentType: 'application/json' },
      );
      if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500);

      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(fileName, 7 * 24 * 60 * 60);

      await supabase.from('privacy_requests').update({
        status: 'completed', export_url: signed?.signedUrl ?? null,
        fulfilled_by: caller.id, fulfilled_at: new Date().toISOString(), notes,
      }).eq('id', request_id);

      return json({ ok: true, export_url: signed?.signedUrl ?? null });
    }

    if (action === 'fulfil_deletion') {
      if (!pr.user_id) return json({ error: 'No matching user_id on request' }, 400);
      // Cascade scrub
      for (const table of USER_TABLES) {
        try { await supabase.from(table).delete().eq('user_id', pr.user_id); } catch (_e) { /* ignore */ }
      }
      try { await supabase.auth.admin.deleteUser(pr.user_id); } catch (e) {
        console.error('[admin-process-privacy-request] auth delete failed', e);
      }
      await supabase.from('privacy_requests').update({
        status: 'completed', fulfilled_by: caller.id, fulfilled_at: new Date().toISOString(), notes,
      }).eq('id', request_id);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('[admin-process-privacy-request] error', e);
    return json({ error: (e as Error).message || 'Internal error' }, 500);
  }
});
