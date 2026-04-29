CREATE TABLE public.halos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent               TEXT NOT NULL CHECK (intent IN ('buy', 'rent')),
  property_types       TEXT[] NOT NULL DEFAULT '{}',
  bedrooms_min         SMALLINT,
  bedrooms_max         SMALLINT,
  bathrooms_min        SMALLINT,
  car_spaces_min       SMALLINT,
  suburbs              TEXT[] NOT NULL DEFAULT '{}',
  suburb_flexibility   BOOLEAN NOT NULL DEFAULT FALSE,
  budget_min           INTEGER,
  budget_max           INTEGER NOT NULL,
  timeframe            TEXT NOT NULL CHECK (timeframe IN ('ready_now','3_to_6_months','6_to_12_months','exploring')),
  finance_status       TEXT NOT NULL CHECK (finance_status IN ('pre_approved','arranging','cash_buyer','not_started')),
  description          TEXT,
  deal_breakers        TEXT,
  must_haves           TEXT[] NOT NULL DEFAULT '{}',
  preferred_language   TEXT NOT NULL DEFAULT 'english',
  referral_source      TEXT,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','expired','fulfilled','deleted')),
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  expiry_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.halos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seekers_own_halos" ON public.halos FOR ALL USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);

CREATE INDEX idx_halos_seeker_id ON public.halos(seeker_id);
CREATE INDEX idx_halos_status ON public.halos(status);

CREATE OR REPLACE FUNCTION public.update_halos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER halos_updated_at
BEFORE UPDATE ON public.halos
FOR EACH ROW
EXECUTE FUNCTION public.update_halos_updated_at();