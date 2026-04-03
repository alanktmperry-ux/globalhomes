CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('trial_start','converted','upgraded','downgraded','cancelled','renewed','payment_failed','payment_recovered')),
  from_plan text,
  to_plan text,
  mrr_change numeric DEFAULT 0,
  stripe_event_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage events' AND tablename = 'subscription_events') THEN
    CREATE POLICY "Admins manage events" ON public.subscription_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS founding_member boolean DEFAULT false, ADD COLUMN IF NOT EXISTS stripe_customer_id text, ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

INSERT INTO public.subscription_events (agent_id, event_type, from_plan, to_plan, mrr_change, created_at)
SELECT a.id, 'converted', 'demo', COALESCE(s.plan_type,'starter'),
  CASE COALESCE(s.plan_type,'starter') WHEN 'starter' THEN 99 WHEN 'pro' THEN 199 WHEN 'agency' THEN 399 ELSE 99 END,
  COALESCE(s.subscription_start, a.created_at)
FROM public.agents a
LEFT JOIN public.agent_subscriptions s ON s.agent_id = a.id
WHERE a.is_subscribed = true
ON CONFLICT DO NOTHING;