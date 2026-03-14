
-- Table: off-market shares between agents
CREATE TABLE public.off_market_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  sharing_agent_id uuid NOT NULL REFERENCES public.agents(id),
  shared_with_agent_id uuid REFERENCES public.agents(id),
  referral_split_pct numeric NOT NULL DEFAULT 25,
  status text NOT NULL DEFAULT 'active',
  is_network_wide boolean NOT NULL DEFAULT false,
  contacted_at timestamp with time zone,
  trust_entry_id uuid REFERENCES public.trust_transactions(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.off_market_shares ENABLE ROW LEVEL SECURITY;

-- Sharing agent can manage their shares
CREATE POLICY "Sharing agent can manage own shares"
  ON public.off_market_shares FOR ALL
  TO authenticated
  USING (sharing_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (sharing_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Shared-with agent can view shares meant for them or network-wide
CREATE POLICY "Agents can view shares for them or network"
  ON public.off_market_shares FOR SELECT
  TO authenticated
  USING (
    is_network_wide = true
    OR shared_with_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Shared-with agent can update (e.g. mark contacted)
CREATE POLICY "Shared-with agent can update"
  ON public.off_market_shares FOR UPDATE
  TO authenticated
  USING (
    shared_with_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR is_network_wide = true
  );

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.off_market_shares;
