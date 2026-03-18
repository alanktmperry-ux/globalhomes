import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "onboarding@resend.dev";
const TEST_TO = "alanktmperry@gmail.com";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  console.log(`[email] → ${to} | ${subject}`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TEST_TO], subject: `[to:${to}] ${subject}`, html }),
  });
  const txt = await res.text();
  if (!res.ok) console.error(`[email] FAILED ${res.status}: ${txt}`);
  else console.log(`[email] OK: ${txt}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) { console.error("RESEND_API_KEY not set"); return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    if (body.action === "submit") {
      const { full_name, email, phone, agency_name, message } = body;
      if (!full_name || !email) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: e } = await supabase.from("demo_requests").insert({ full_name, email, phone: phone||null, agency_name: agency_name||null, message: message||null, demo_code: code, demo_code_expires_at: expiresAt });
      if (e) throw e;
      await sendEmail(apiKey, "sales@everythingeco.com.au", `New Demo Request: ${full_name}`,
        `<h2>New Demo Request</h2><p>Name: ${full_name}</p><p>Agency: ${agency_name||"—"}</p><p>Email: ${email}</p><p>Phone: ${phone||"—"}</p><p>${message||""}</p><p><a href="https://globalhomes.lovable.app/admin">Approve in Admin →</a></p>`);
      await sendEmail(apiKey, email, "Your Global Homes Demo Request Received",
        `<p>Hi ${full_name},</p><p>Thanks for requesting a demo of Global Homes. We'll review your request and send your access code to ${email} once approved.</p><p>© Global Homes · Melbourne, Australia</p>`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (body.action === "send_code") {
      const { request_id } = body;
      if (!request_id) return new Response(JSON.stringify({ error: "Missing request_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: r, error: fe } = await supabase.from("demo_requests").select("*").eq("id", request_id).single();
      if (fe || !r) throw fe || new Error("Not found");
      const code = r.demo_code || generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("demo_requests").update({ status: "approved", demo_code: code, demo_code_expires_at: expiresAt }).eq("id", request_id);
      const demoUrl = `https://globalhomes.lovable.app/agents/demo?email=${encodeURIComponent(r.email)}`;
      await sendEmail(apiKey, r.email, "Your Global Homes Demo Access Code",
        `<p>Hi ${r.full_name},</p><p>Your demo has been approved!</p><h2>Access Code:</h2><h1>${code}</h1><p>Valid for 7 days.</p><p><a href="${demoUrl}">Access My Demo →</a></p><p>© Global Homes · Melbourne, Australia</p>`);
      return new Response(JSON.stringify({ success: true, code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err: any) {
    console.error("handle-demo-request error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
