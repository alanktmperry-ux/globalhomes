CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  offer_amount numeric NOT NULL,
  settlement_days integer NOT NULL DEFAULT 60,
  conditions text,
  draft_text text,
  comparable_sales jsonb DEFAULT '[]'::jsonb,
  suburb_median numeric,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own offers" ON public.offers
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT agents.id FROM agents WHERE agents.user_id = auth.uid()));

CREATE POLICY "Agents can insert own offers" ON public.offers
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT agents.id FROM agents WHERE agents.user_id = auth.uid()));

CREATE POLICY "Agents can update own offers" ON public.offers
  FOR UPDATE TO authenticated
  USING (agent_id IN (SELECT agents.id FROM agents WHERE agents.user_id = auth.uid()));

CREATE POLICY "Agents can delete own offers" ON public.offers
  FOR DELETE TO authenticated
  USING (agent_id IN (SELECT agents.id FROM agents WHERE agents.user_id = auth.uid()));