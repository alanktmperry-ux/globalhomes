-- ============================================================
-- ListHQ Drip Sequence System
-- Post-launch: SMS + email automation for agent onboarding,
-- lead follow-up, and review collection.
--
-- All sequences are seeded with is_active = FALSE.
-- Flip to TRUE in the Supabase dashboard after launch.
-- ============================================================


-- 1. TABLES

CREATE TABLE IF NOT EXISTS public.drip_sequences (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  trigger_event  text        NOT NULL,
  -- 'agent_signup' | 'no_listing_48h' | 'lead_contact' | 'property_sold'
  description    text,
  is_active      boolean     DEFAULT false,  -- off until post-launch
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drip_sequence_steps (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id  uuid    NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  step_order   int     NOT NULL,
  delay_hours  int     NOT NULL DEFAULT 0,
  channel      text    NOT NULL CHECK (channel IN ('email', 'sms')),
  subject      text,   -- email only
  body         text    NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.drip_enrollments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid        NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  sequence_id     uuid        NOT NULL REFERENCES public.drip_sequences(id),
  enrolled_at     timestamptz DEFAULT now(),
  next_step_order int         DEFAULT 1,
  completed       boolean     DEFAULT false,
  metadata        jsonb       DEFAULT '{}',
  -- metadata carries context: buyer_name, property_address, property_id etc.
  created_at      timestamptz DEFAULT now(),
  UNIQUE (agent_id, sequence_id)  -- one active enrollment per sequence
);

CREATE TABLE IF NOT EXISTS public.drip_send_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid        NOT NULL REFERENCES public.drip_enrollments(id),
  step_id       uuid        NOT NULL REFERENCES public.drip_sequence_steps(id),
  channel       text        NOT NULL,
  recipient     text        NOT NULL,
  status        text        DEFAULT 'sent',  -- 'sent' | 'failed' | 'skipped'
  error         text,
  sent_at       timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_active
  ON public.drip_enrollments (sequence_id, next_step_order, enrolled_at)
  WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_drip_enrollments_agent
  ON public.drip_enrollments (agent_id);


-- 2. RLS

ALTER TABLE public.drip_sequences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_send_log       ENABLE ROW LEVEL SECURITY;

-- Agents can view their own enrollments (useful for dashboard "you're on day 3" UI later)
CREATE POLICY "Agents view own enrollments"
  ON public.drip_enrollments FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Service role (edge functions) bypasses RLS automatically


-- 3. SEED: 4 core sequences (all is_active = false until you flip them post-launch)

-- ── Sequence 1: Agent Onboarding ──────────────────────────────
WITH seq AS (
  INSERT INTO public.drip_sequences (name, trigger_event, description, is_active)
  VALUES (
    'Agent Onboarding',
    'agent_signup',
    'Fires the moment a new agent creates their profile. Guides them to first listing and profile completion.',
    false
  )
  RETURNING id
)
INSERT INTO public.drip_sequence_steps (sequence_id, step_order, delay_hours, channel, subject, body)
VALUES
  -- Day 0: Welcome email immediately
  ((SELECT id FROM seq), 1, 0, 'email',
   'Welcome to ListHQ, {{agent_name}} 👋',
   '<p>Hi {{agent_name}},</p>
<p>Your agent profile is now live on ListHQ — Australia''s fastest growing property platform.</p>
<p>Your next step is to add your first listing. It takes less than 2 minutes.</p>
<p><a href="https://listhq.com.au/agent/dashboard/listings/new" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Add My First Listing →</a></p>
<p>— The ListHQ Team</p>'),

  -- Day 1: Profile completion nudge
  ((SELECT id FROM seq), 2, 24, 'email',
   'One more thing to unlock your Verified Score, {{agent_name}}',
   '<p>Hi {{agent_name}},</p>
<p>Agents with a complete profile get <strong>3× more enquiries</strong> on ListHQ.</p>
<p>Take 2 minutes to add your bio, phone number, and a profile photo — this unlocks your <strong>ListHQ Verified Score</strong>, which appears on your public profile and helps buyers trust you.</p>
<p><a href="https://listhq.com.au/agent/dashboard/profile" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Complete My Profile →</a></p>
<p>— The ListHQ Team</p>'),

  -- Day 3: SMS nudge
  ((SELECT id FROM seq), 3, 72, 'sms',
   NULL,
   'Hi {{agent_name}}, your ListHQ profile is live! Add a listing now and start getting enquiries: https://listhq.com.au/agent/dashboard'),

  -- Day 7: Check-in email
  ((SELECT id FROM seq), 4, 168, 'email',
   'How is ListHQ working for you?',
   '<p>Hi {{agent_name}},</p>
<p>You signed up to ListHQ a week ago — we wanted to check in.</p>
<p>If you have any questions, need help adding a listing, or want to understand your Verified Score, just reply to this email. We read every one.</p>
<p>— The ListHQ Team</p>');


-- ── Sequence 2: No Listing Nudge ──────────────────────────────
WITH seq AS (
  INSERT INTO public.drip_sequences (name, trigger_event, description, is_active)
  VALUES (
    'No Listing Nudge',
    'no_listing_48h',
    'Fires 48h after signup if the agent has not added any listing yet. Enrolled programmatically by the no-listing checker cron.',
    false
  )
  RETURNING id
)
INSERT INTO public.drip_sequence_steps (sequence_id, step_order, delay_hours, channel, subject, body)
VALUES
  -- Immediate SMS on enrollment (48h after signup)
  ((SELECT id FROM seq), 1, 0, 'sms',
   NULL,
   'Hi {{agent_name}}, you are set up on ListHQ but haven''t listed yet. Takes 2 mins: https://listhq.com.au/agent/dashboard/listings/new'),

  -- 3 days later: email
  ((SELECT id FROM seq), 2, 72, 'email',
   'Your competitors are already listing on ListHQ',
   '<p>Hi {{agent_name}},</p>
<p>Agents in your area are already receiving enquiries on ListHQ. You signed up but haven''t added a listing yet.</p>
<p>Don''t let them get ahead. Add your first listing now — it takes less than 2 minutes.</p>
<p><a href="https://listhq.com.au/agent/dashboard/listings/new" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Add My First Listing →</a></p>
<p>— The ListHQ Team</p>');


-- ── Sequence 3: Lead Follow-up ────────────────────────────────
WITH seq AS (
  INSERT INTO public.drip_sequences (name, trigger_event, description, is_active)
  VALUES (
    'Lead Follow-up',
    'lead_contact',
    'Fires when a buyer sends an enquiry to an agent. Enrolled via the capture-lead edge function. metadata: { buyer_name, property_address, property_id }.',
    false
  )
  RETURNING id
)
INSERT INTO public.drip_sequence_steps (sequence_id, step_order, delay_hours, channel, subject, body)
VALUES
  -- Immediate SMS: new lead notification
  ((SELECT id FROM seq), 1, 0, 'sms',
   NULL,
   'New ListHQ lead! {{buyer_name}} enquired about {{property_address}}. Reply now: https://listhq.com.au/agent/dashboard/leads'),

  -- 24h later: unresponded lead email
  ((SELECT id FROM seq), 2, 24, 'email',
   'You have an unanswered lead on ListHQ',
   '<p>Hi {{agent_name}},</p>
<p><strong>{{buyer_name}}</strong> enquired about <strong>{{property_address}}</strong> yesterday and has not received a reply yet.</p>
<p>Agents who respond within 1 hour are <strong>7× more likely to convert</strong> the lead.</p>
<p><a href="https://listhq.com.au/agent/dashboard/leads" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Lead →</a></p>
<p>— The ListHQ Team</p>');


-- ── Sequence 4: Review Request ────────────────────────────────
WITH seq AS (
  INSERT INTO public.drip_sequences (name, trigger_event, description, is_active)
  VALUES (
    'Review Request',
    'property_sold',
    'Fires when a property is marked sold. Enrolled via DB trigger or edge function. metadata: { property_address }. Prompts the agent to request a review from their client.',
    false
  )
  RETURNING id
)
INSERT INTO public.drip_sequence_steps (sequence_id, step_order, delay_hours, channel, subject, body)
VALUES
  -- 72h after sold: congratulations + review prompt
  ((SELECT id FROM seq), 1, 72, 'email',
   'Congrats on the sale! Time to collect your review 🎉',
   '<p>Hi {{agent_name}},</p>
<p>Congratulations on selling <strong>{{property_address}}</strong>!</p>
<p>Now is the perfect time to ask your client for a review — it takes them 60 seconds and directly improves your <strong>ListHQ Verified Score</strong>, which drives more enquiries to your listings.</p>
<p><a href="https://listhq.com.au/agent/dashboard/reviews/request" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Send Review Request →</a></p>
<p>Agents with 5+ reviews get significantly more profile views on ListHQ.</p>
<p>— The ListHQ Team</p>');


-- 4. AUTO-ENROLL TRIGGER: Enroll new agents in the onboarding sequence on INSERT

CREATE OR REPLACE FUNCTION public.enroll_agent_in_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence_id uuid;
BEGIN
  -- Only enroll if the onboarding sequence is active
  SELECT id INTO v_sequence_id
  FROM public.drip_sequences
  WHERE trigger_event = 'agent_signup'
    AND is_active = true
  LIMIT 1;

  IF v_sequence_id IS NOT NULL THEN
    INSERT INTO public.drip_enrollments (agent_id, sequence_id)
    VALUES (NEW.id, v_sequence_id)
    ON CONFLICT (agent_id, sequence_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enroll_agent_onboarding ON public.agents;
CREATE TRIGGER trigger_enroll_agent_onboarding
  AFTER INSERT ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.enroll_agent_in_onboarding();


-- ============================================================
-- 5. CRON JOB SETUP (run manually in Supabase SQL editor post-launch)
--
-- Step 1: Enable pg_cron and pg_net in Supabase Dashboard →
--         Database → Extensions
--
-- Step 2: Go to Dashboard → Database → SQL Editor and run:
--
-- SELECT cron.schedule(
--   'process-drip-sequences',
--   '0 * * * *',   -- every hour on the hour
--   $$
--   SELECT net.http_post(
--     url     := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/drip-processor',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- Step 3: To activate sequences, run:
--   UPDATE drip_sequences SET is_active = true WHERE trigger_event = 'agent_signup';
--   UPDATE drip_sequences SET is_active = true WHERE trigger_event = 'lead_contact';
--   (etc. — activate one at a time so you can monitor)
-- ============================================================
