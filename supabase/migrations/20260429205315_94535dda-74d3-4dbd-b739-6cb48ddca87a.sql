
ALTER TABLE public.halos ADD COLUMN IF NOT EXISTS source_listing_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE public.halos ADD COLUMN IF NOT EXISTS source_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.halos ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('direct','listing_qr','crm_invite','rent_roll','voice_lead','settlement'));

CREATE TABLE IF NOT EXISTS public.halo_referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  halo_id UUID NOT NULL REFERENCES public.halos(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('crm_invite','listing_qr','rent_roll','settlement')),
  credit_granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referring_agent_id, halo_id)
);

CREATE TABLE IF NOT EXISTS public.halo_pocket_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  halo_id UUID NOT NULL REFERENCES public.halos(id) ON DELETE CASCADE,
  pocket_listing_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(halo_id, pocket_listing_id)
);

CREATE TABLE IF NOT EXISTS public.halo_suburb_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  halo_count INTEGER NOT NULL
);

ALTER TABLE public.halo_referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_pocket_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halo_suburb_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_own_referral_credits" ON public.halo_referral_credits FOR ALL USING (auth.uid() = referring_agent_id) WITH CHECK (auth.uid() = referring_agent_id);
CREATE POLICY "agents_own_pocket_matches" ON public.halo_pocket_matches FOR ALL USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "agents_own_digests" ON public.halo_suburb_digests FOR ALL USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);

ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS halo_invite_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_halos_source_agent ON public.halos(source_agent_id) WHERE source_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_halo_pocket_matches_agent ON public.halo_pocket_matches(agent_id);
CREATE INDEX IF NOT EXISTS idx_halo_suburb_digests_agent_date ON public.halo_suburb_digests(agent_id, sent_at DESC);
