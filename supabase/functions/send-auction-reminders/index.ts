import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM") || "ListHQ <noreply@listhq.com.au>";

  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const windowMs = 35 * 60 * 1000; // 35 min window (hourly cron)

  // Find auction properties happening in the next ~24h or ~1h
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: auctionProps } = await supabase
    .from("properties")
    .select("id, address, suburb, state, auction_date")
    .eq("status", "auction")
    .not("auction_date", "is", null)
    .gte("auction_date", now.toISOString());

  if (!auctionProps?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalSent = 0;

  for (const prop of auctionProps) {
    const auctionTime = new Date(prop.auction_date);
    const hoursUntil = (auctionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only send reminders in the ~24h or ~1h windows
    const is24hWindow = hoursUntil >= 23 && hoursUntil <= 25;
    const is1hWindow = hoursUntil >= 0.5 && hoursUntil <= 1.5;

    if (!is24hWindow && !is1hWindow) continue;

    const reminderType = is24hWindow ? "24-hour" : "1-hour";

    const { data: regs } = await supabase
      .from("auction_registrations")
      .select("name, email")
      .eq("property_id", prop.id);

    if (!regs?.length || !resendKey) continue;

    const auctionLabel = auctionTime.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const reg of regs) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to: reg.email,
            subject: `${reminderType} reminder: Auction at ${prop.address}`,
            html: `
              <h2>Auction Reminder</h2>
              <p>Hi ${reg.name},</p>
              <p>This is your <strong>${reminderType}</strong> reminder for the auction at:</p>
              <p><strong>${prop.address}, ${prop.suburb} ${prop.state}</strong></p>
              <p>${auctionLabel}</p>
              <p>Good luck! Contact the listing agent directly if you have any questions.</p>
              <p style="color:#999;font-size:12px;">— ListHQ</p>
            `,
          }),
        });
        totalSent++;
      } catch (e) {
        console.error("Failed to send reminder:", e);
      }
    }
  }

  return new Response(JSON.stringify({ sent: totalSent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
