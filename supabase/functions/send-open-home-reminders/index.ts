import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
  const APP_URL    = Deno.env.get('APP_URL') ?? 'https://listhq.com.au';
  const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'ListHQ <openhomes@listhq.com.au>';

  const now    = new Date();
  const in24h  = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h   = new Date(now.getTime() + 60 * 60 * 1000);
  const window = 10 * 60 * 1000;

  let sent24h = 0;
  let sent1h  = 0;

  // ── 24-hour reminders ──────────────────────────────────────────────
  const { data: sessions24 } = await supabase
    .from('open_homes')
    .select(`
      id, starts_at, ends_at,
      properties ( address, suburb, state, cover_image_url ),
      open_home_registrations ( id, full_name, email, on_waitlist )
    `)
    .eq('status', 'scheduled')
    .gte('starts_at', new Date(in24h.getTime() - window).toISOString())
    .lte('starts_at', new Date(in24h.getTime() + window).toISOString());

  // Filter for sessions where reminder_24h_sent is not yet true
  const filtered24 = (sessions24 ?? []).filter((s: any) => !s.reminder_24h_sent);

  for (const session of filtered24) {
    const confirmed = ((session as any).open_home_registrations ?? [])
      .filter((r: any) => !r.on_waitlist);
    const prop    = (session as any).properties ?? {};
    const address = `${prop.address}, ${prop.suburb} ${prop.state}`;
    const dateStr = new Date(session.starts_at).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const timeStr = new Date(session.starts_at).toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit',
    });
    const endStr = new Date(session.ends_at).toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit',
    });

    for (const reg of confirmed) {
      if (!reg.email || !RESEND_KEY) continue;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [reg.email],
          subject: `Reminder: Open Home tomorrow — ${address}`,
          html: `
            <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;padding:24px">
              <p>Hi ${reg.full_name?.split(' ')[0] ?? 'there'},</p>
              <p>Just a reminder — you're registered for an open home tomorrow:</p>
              ${prop.cover_image_url ? `<img src="${prop.cover_image_url}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:16px 0" />` : ''}
              <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0">
                <p style="margin:4px 0;font-weight:600">📍 ${address}</p>
                <p style="margin:4px 0">📅 ${dateStr}</p>
                <p style="margin:4px 0">⏰ ${timeStr} – ${endStr}</p>
              </div>
              <p style="color:#666;font-size:14px">Can't make it? Cancel your spot so others can attend.</p>
              <p style="color:#666;font-size:14px">The ListHQ team</p>
            </div>
          `,
        }),
      });
      sent24h++;
    }

    await supabase
      .from('open_homes')
      .update({ reminder_24h_sent: true } as any)
      .eq('id', session.id);
  }

  // ── 1-hour reminders ───────────────────────────────────────────────
  const { data: sessions1 } = await supabase
    .from('open_homes')
    .select(`
      id, starts_at, ends_at,
      properties ( address, suburb, state ),
      open_home_registrations ( id, full_name, email, on_waitlist )
    `)
    .eq('status', 'scheduled')
    .gte('starts_at', new Date(in1h.getTime() - window).toISOString())
    .lte('starts_at', new Date(in1h.getTime() + window).toISOString());

  const filtered1 = (sessions1 ?? []).filter((s: any) => !s.reminder_1h_sent);

  for (const session of filtered1) {
    const confirmed = ((session as any).open_home_registrations ?? [])
      .filter((r: any) => !r.on_waitlist);
    const prop    = (session as any).properties ?? {};
    const address = `${prop.address}, ${prop.suburb} ${prop.state}`;
    const timeStr = new Date(session.starts_at).toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit',
    });

    for (const reg of confirmed) {
      if (!reg.email || !RESEND_KEY) continue;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [reg.email],
          subject: `Starting in 1 hour: ${address}`,
          html: `
            <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;padding:24px">
              <p>Hi ${reg.full_name?.split(' ')[0] ?? 'there'}, see you soon!</p>
              <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0">
                <p style="margin:4px 0;font-weight:600">📍 ${address}</p>
                <p style="margin:4px 0">⏰ Starting at ${timeStr} — 1 hour away</p>
              </div>
              <p style="color:#666;font-size:14px">The ListHQ team</p>
            </div>
          `,
        }),
      });
      sent1h++;
    }

    await supabase
      .from('open_homes')
      .update({ reminder_1h_sent: true } as any)
      .eq('id', session.id);
  }

  return new Response(JSON.stringify({ sent24h, sent1h }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
