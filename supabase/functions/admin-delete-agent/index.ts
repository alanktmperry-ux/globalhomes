import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // --- Verify JWT first, before any other logic ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return respond({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return respond({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin"])
      .maybeSingle();

    if (!roleCheck) return respond({ error: "Forbidden — admin role required" }, 403);

    // --- Parse body ---
    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return respond({ error: "Missing or invalid userId" }, 400);
    }

    const errors: string[] = [];

    // Step 1: Get the agent record
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const agentId = agent?.id;

    // Step 2: Delete audit_log entries referencing this agent
    if (agentId) {
      const { error } = await supabase
        .from("audit_log")
        .delete()
        .eq("agent_id", agentId);
      if (error) {
        console.error("Failed to delete audit_log:", error);
        errors.push(`audit_log: ${error.message}`);
      }
    }

    // Step 3: Fully delete all properties and dependent records
    if (agentId) {
      const { data: agentProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("agent_id", agentId);

      const propertyIds = (agentProperties || []).map((p) => p.id);

      if (propertyIds.length > 0) {
        // Delete property-dependent records first (in dependency order)
        const propertyChildTables: Array<{ table: string; column: string }> = [
          { table: "listing_documents", column: "property_id" },
          { table: "saved_properties", column: "property_id" },
          { table: "lead_events", column: "property_id" },
          { table: "leads", column: "property_id" },
          { table: "collab_reactions", column: "property_id" },
          { table: "collab_views", column: "property_id" },
          { table: "rental_applications", column: "property_id" },
          { table: "off_market_shares", column: "property_id" },
          { table: "listing_buyer_matches", column: "listing_id" },
        ];

        for (const { table, column } of propertyChildTables) {
          const { error } = await supabase
            .from(table)
            .delete()
            .in(column, propertyIds);
          if (error) {
            // Ignore "table does not exist" errors so missing optional tables don't block deletion
            if (!/does not exist|schema cache/i.test(error.message)) {
              console.error(`Failed to delete ${table}:`, error);
              errors.push(`${table}: ${error.message}`);
            }
          }
        }

        // Finally delete the properties themselves
        const { error: propsError } = await supabase
          .from("properties")
          .delete()
          .eq("agent_id", agentId);
        if (propsError) {
          console.error("Failed to delete properties:", propsError);
          errors.push(`properties: ${propsError.message}`);
        }
      }
    }

    // Step 3: Delete trust_accounts
    if (agentId) {
      // Delete trust child records first
      const { data: trustAccounts } = await supabase
        .from("trust_accounts")
        .select("id")
        .eq("agent_id", agentId);

      if (trustAccounts && trustAccounts.length > 0) {
        const taIds = trustAccounts.map((t) => t.id);
        await supabase.from("trust_transactions").delete().in("trust_account_id", taIds);
      }

      // Also clean up trust balance/receipt/payment/reconciliation records
      for (const table of [
        "trust_account_balances",
        "trust_receipts",
        "trust_payments",
        "trust_reconciliations",
      ]) {
        const { error } = await supabase.from(table).delete().eq("agent_id", agentId);
        if (error) {
          console.error(`Failed to delete ${table}:`, error);
          errors.push(`${table}: ${error.message}`);
        }
      }

      const { error } = await supabase
        .from("trust_accounts")
        .delete()
        .eq("agent_id", agentId);
      if (error) {
        console.error("Failed to delete trust_accounts:", error);
        errors.push(`trust_accounts: ${error.message}`);
      }
    }

    // Step 4: Delete agency_members
    {
      const { error } = await supabase
        .from("agency_members")
        .delete()
        .eq("user_id", userId);
      if (error) {
        console.error("Failed to delete agency_members:", error);
        errors.push(`agency_members: ${error.message}`);
      }
    }

    // Step 5: Delete user_roles
    {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (error) {
        console.error("Failed to delete user_roles:", error);
        errors.push(`user_roles: ${error.message}`);
      }
    }

    // Step 6: Delete contacts
    if (agentId) {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("assigned_agent_id", agentId);
      if (error) {
        console.error("Failed to delete contacts:", error);
        errors.push(`contacts: ${error.message}`);
      }
    }

    // Step 7: Run full cascade cleanup via existing RPC (handles all remaining child records)
    {
      const { error } = await supabase.rpc("delete_user_cascade", {
        p_user_id: userId,
      });
      if (error) {
        console.error("delete_user_cascade RPC error:", error);
        errors.push(`delete_user_cascade: ${error.message}`);
        // Continue — still delete the auth user even if cascade had errors
      }
    }

    // Step 8: Delete auth user (final step)
    {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        console.error("Failed to delete auth user:", error);
        errors.push(`auth_user: ${error.message}`);
      }
    }

    // Audit log
    try {
      await supabase.from("audit_log").insert({
        user_id: caller.id,
        action_type: "admin_delete_agent",
        entity_type: "agent",
        entity_id: userId,
        description: "Admin deleted agent and all associated data",
        metadata: { cascade: true },
      });
    } catch (e) {
      console.error("audit log:", e);
    }

    if (errors.length > 0) {
      console.warn("Agent deletion completed with errors:", errors);
      return respond({ success: true, partial: true, errors });
    }

    return respond({ success: true });
  } catch (err) {
    console.error("admin-delete-agent error:", err);
    return respond({ error: (err as Error).message }, 200);
  }
});
