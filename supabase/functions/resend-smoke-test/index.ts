// Temporary smoke test — verifies RESEND_API_KEY/EMAIL_FROM/ADMIN_EMAIL end-to-end.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") || "ListHQ <hello@listhq.com.au>";
  const to = Deno.env.get("ADMIN_EMAIL") || "alanktmperry@gmail.com";
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "ListHQ Resend smoke test ✅",
      html: `<p>End-to-end Resend verification — please ignore.</p><p>Sent ${new Date().toISOString()}</p>`,
    }),
  });
  const body = await r.text();
  console.log(`[smoke] status=${r.status} body=${body}`);
  return new Response(JSON.stringify({ ok: r.ok, status: r.status, resend: body, from, to }), {
    status: r.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
