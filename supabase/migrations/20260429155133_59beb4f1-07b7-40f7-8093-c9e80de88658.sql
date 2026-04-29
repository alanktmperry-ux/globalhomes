-- Sprint 3: Halo lifecycle, scoring, credit packages

ALTER TABLE public.halos ADD COLUMN IF NOT EXISTS quality_score SMALLINT;
ALTER TABLE public.halos ADD COLUMN IF NOT EXISTS no_response_alert_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.halo_credit_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  credits         INTEGER NOT NULL,
  price_aud       INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.halo_credit_purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES public.halo_credit_packages(id),
  stripe_session_id TEXT NOT NULL,
  credits_granted   INTEGER NOT NULL,
  amount_paid_aud   INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','refunded')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.halo_credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_packages" ON public.halo_credit_packages;
CREATE POLICY "public_read_packages" ON public.halo_credit_packages
  FOR SELECT USING (active = TRUE);

DROP POLICY IF EXISTS "agents_own_purchases" ON public.halo_credit_purchases;
CREATE POLICY "agents_own_purchases" ON public.halo_credit_purchases
  FOR ALL USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);

-- Ensure pg_cron + pg_net are enabled for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;