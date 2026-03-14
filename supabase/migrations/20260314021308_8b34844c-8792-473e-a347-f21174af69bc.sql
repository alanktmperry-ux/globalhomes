
-- Add investment niche and trust accounting fields to agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS investment_niche text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS handles_trust_accounting boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.agents.investment_niche IS 'Investment specialization niche: family_homes, first_home_buyers, coastal_str, new_builds, foreign_investors, commercial';
COMMENT ON COLUMN public.agents.handles_trust_accounting IS 'Whether agent needs compliance-ready trust reporting';
