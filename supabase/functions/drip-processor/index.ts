/**
 * drip-processor
 *
 * Runs every hour via pg_cron. Finds all drip enrollments that have a step
 * due (enrolled_at + delay_hours <= now()), sends the message via Resend
 * (email) or Twilio (SMS), logs the result, and advances the enrollment.
 *
 * Required Supabase secrets:
 *   RESEND_API_KEY         — for email
 *   TWILIO_ACCOUNT_SID     — for SMS
 *   TWILIO_AUTH_TOKEN      — for SMS
 *   TWILIO_PHONE_NUMBER    — your Twilio sender number (E.164 format)
 *
 * Deploy: supabase functions deploy drip-processor --project-ref ngrkbohpmkzjonaofgbb
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Helpers ──────────────────────────────────────────────────

/** Replace {{key}} tokens in a template string */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ListHQ <noreply@listhq.com.au>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }
  return { ok: true };
}

async function sendSMS(
  to: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from  = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!sid || !token || !from) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Twilio ${res.status}: ${text}` };
  }
  return { ok: true };
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const results = { processed: 0, skipped: 0, errors: 0, details: [] as string[] };

  try {
    // 1. Fetch all incomplete enrollments for active sequences
    const { data: enrollments, error: fetchErr } = await supabase
      .from('drip_enrollments')
      .select(`
        id,
        agent_id,
        enrolled_at,
        next_step_order,
        metadata,
        sequence_id,
        drip_sequences ( id, name, trigger_event, is_active ),
        agents ( id, name, email, phone )
      `)
      .eq('completed', false);

    if (fetchErr) throw fetchErr;
    if (!enrollments?.length) {
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Filter to only active sequences (join may not filter automatically)
    const active = enrollments.filter((e: any) => e.drip_sequences?.is_active);

    for (const enrollment of active) {
      const agent    = enrollment.agents    as any;
      const sequence = enrollment.drip_sequences as any;

      // 2. Get the current due step
      const { data: step, error: stepErr } = await supabase
        .from('drip_sequence_steps')
        .select('*')
        .eq('sequence_id', sequence.id)
        .eq('step_order', enrollment.next_step_order)
        .maybeSingle();

      if (stepErr) {
        results.errors++;
        results.details.push(`enrollment ${enrollment.id}: ${stepErr.message}`);
        continue;
      }

      if (!step) {
        // No more steps — mark enrollment complete
        await supabase
          .from('drip_enrollments')
          .update({ completed: true })
          .eq('id', enrollment.id);
        results.skipped++;
        continue;
      }

      // 3. Check timing
      const enrolledAt = new Date(enrollment.enrolled_at);
      const dueAt = new Date(enrolledAt.getTime() + step.delay_hours * 60 * 60 * 1000);
      if (new Date() < dueAt) {
        results.skipped++;
        continue; // not yet due
      }

      // 4. Build template variables from agent data + metadata
      const meta = (enrollment.metadata ?? {}) as Record<string, string>;
      const vars: Record<string, string> = {
        agent_name:       agent?.name           ?? 'there',
        agent_id:         agent?.id             ?? '',
        buyer_name:       meta.buyer_name       ?? 'A buyer',
        property_address: meta.property_address ?? 'your listing',
        ...meta,
      };

      // 5. Send
      let sendResult: { ok: boolean; error?: string } = { ok: false, error: 'No contact info' };
      let recipient = 'N/A';

      if (step.channel === 'email' && agent?.email) {
        recipient = agent.email;
        const subject = interpolate(step.subject ?? '', vars);
        const html    = interpolate(step.body, vars);
        sendResult = await sendEmail(recipient, subject, html);

      } else if (step.channel === 'sms' && agent?.phone) {
        recipient = agent.phone;
        const body = interpolate(step.body, vars);
        sendResult = await sendSMS(recipient, body);

      } else {
        // Agent has no email/phone for this channel — skip gracefully
        sendResult = { ok: true };
        recipient = 'N/A (no contact info)';
      }

      // 6. Log the send
      await supabase.from('drip_send_log').insert({
        enrollment_id: enrollment.id,
        step_id:       step.id,
        channel:       step.channel,
        recipient,
        status:  sendResult.ok ? 'sent' : 'failed',
        error:   sendResult.error ?? null,
      });

      if (sendResult.ok) {
        // 7. Advance or complete enrollment
        const { data: nextStep } = await supabase
          .from('drip_sequence_steps')
          .select('id')
          .eq('sequence_id', sequence.id)
          .eq('step_order', enrollment.next_step_order + 1)
          .maybeSingle();

        await supabase
          .from('drip_enrollments')
          .update({
            next_step_order: enrollment.next_step_order + 1,
            completed:       !nextStep,
          })
          .eq('id', enrollment.id);

        results.processed++;
        results.details.push(
          `✓ ${step.channel} → ${recipient} (${sequence.name} step ${step.step_order})`
        );
      } else {
        results.errors++;
        results.details.push(
          `✗ ${step.channel} → ${recipient}: ${sendResult.error}`
        );
      }
    }

    console.log('drip-processor run:', results);
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('drip-processor fatal:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
