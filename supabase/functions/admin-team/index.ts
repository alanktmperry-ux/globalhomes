// Admin team management — list team members, invite new members, set roles, disable/enable.
// Caller must be 'admin' role (super_admin not implemented in this codebase; admins manage admins).
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logAdminAction } from "../_shared/adminAudit.ts";

type TeamRole = "admin" | "support" | "partner";
const ALLOWED_ROLES: TeamRole[] = ["admin", "support", "partner"];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "").trim();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (userErr || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      // All users with role in admin/support/partner + pending invites
      const { data: roleRows, error: roleErr } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "support", "partner"]);
      if (roleErr) throw roleErr;

      const userIds = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));

      // Fetch auth users (paginated to be safe)
      const allAuth: any[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        allAuth.push(...(data?.users ?? []));
        if (!data?.users || data.users.length < 1000) break;
        page++;
        if (page > 10) break;
      }
      const authMap = new Map(allAuth.map((u) => [u.id, u]));

      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, display_name");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));

      const rolesByUser = new Map<string, string[]>();
      (roleRows ?? []).forEach((r) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });

      const team = userIds.map((id) => {
        const u = authMap.get(id);
        return {
          id,
          email: u?.email ?? null,
          display_name: profileMap.get(id) ?? null,
          roles: rolesByUser.get(id) ?? [],
          last_sign_in_at: u?.last_sign_in_at ?? null,
          created_at: u?.created_at ?? null,
          disabled: u?.user_metadata?.disabled === true,
          invited_pending: !u?.last_sign_in_at && !!u?.invited_at,
        };
      });

      // Pending invites: invited but never signed in (across all auth users)
      const pendingInvites = allAuth
        .filter((u) => !u.last_sign_in_at && u.invited_at)
        .map((u) => ({
          id: u.id,
          email: u.email,
          invited_at: u.invited_at,
          roles: rolesByUser.get(u.id) ?? [],
        }));

      return json({ team, pendingInvites });
    }

    if (action === "invite") {
      const email = (body.email as string)?.trim().toLowerCase();
      const role = body.role as TeamRole;
      const notes = (body.notes as string) ?? null;
      if (!email || !ALLOWED_ROLES.includes(role)) {
        return json({ error: "email and valid role required" }, 400);
      }

      // Try to invite by email; if user exists, just add the role
      let userId: string | null = null;
      const { data: existing } = await admin.auth.admin.getUserByEmail(email);
      if (existing?.user) {
        userId = existing.user.id;
      } else {
        const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
        if (inviteErr) return json({ error: inviteErr.message }, 400);
        userId = invited.user?.id ?? null;
      }
      if (!userId) return json({ error: "Could not create user" }, 500);

      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role })
        .select()
        .maybeSingle();
      // ignore duplicate
      if (roleErr && !roleErr.message.includes("duplicate")) {
        return json({ error: roleErr.message }, 500);
      }

      await logAdminAction({
        actor_id: caller.id,
        actor_email: caller.email ?? "unknown",
        action: "admin.team_invite",
        target_type: "user",
        target_id: userId,
        target_summary: email,
        notes,
        after_state: { role },
        request: req,
      });

      return json({ ok: true, user_id: userId });
    }

    if (action === "set_roles") {
      const userId = body.user_id as string;
      const roles = body.roles as TeamRole[];
      if (!userId || !Array.isArray(roles)) return json({ error: "user_id and roles required" }, 400);
      const valid = roles.filter((r) => ALLOWED_ROLES.includes(r));

      // Replace admin/support/partner roles for this user
      const { data: existing } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "support", "partner"]);
      const existingRoles = (existing ?? []).map((r: any) => r.role);

      const toAdd = valid.filter((r) => !existingRoles.includes(r));
      const toRemove = existingRoles.filter((r) => !valid.includes(r as TeamRole));

      if (toRemove.length) {
        await admin.from("user_roles").delete().eq("user_id", userId).in("role", toRemove);
      }
      if (toAdd.length) {
        await admin.from("user_roles").insert(toAdd.map((role) => ({ user_id: userId, role })));
      }

      await logAdminAction({
        actor_id: caller.id,
        actor_email: caller.email ?? "unknown",
        action: "admin.team_roles_changed",
        target_type: "user",
        target_id: userId,
        before_state: { roles: existingRoles },
        after_state: { roles: valid },
        request: req,
      });

      return json({ ok: true });
    }

    if (action === "disable" || action === "enable") {
      const userId = body.user_id as string;
      if (!userId) return json({ error: "user_id required" }, 400);
      const disabled = action === "disable";
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const meta = { ...(u?.user?.user_metadata ?? {}), disabled };
      const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: meta });
      if (error) return json({ error: error.message }, 500);

      await logAdminAction({
        actor_id: caller.id,
        actor_email: caller.email ?? "unknown",
        action: disabled ? "admin.team_disabled" : "admin.team_enabled",
        target_type: "user",
        target_id: userId,
        request: req,
      });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[admin-team] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
