CREATE TABLE IF NOT EXISTS public.tenancy_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  agent_id uuid,
  type text,
  subject text,
  recipient_email text,
  status text NOT NULL DEFAULT 'sent',
  metadata jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenancy_communications_tenancy ON public.tenancy_communications(tenancy_id, sent_at DESC);

ALTER TABLE public.tenancy_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view own tenancy communications" ON public.tenancy_communications;
CREATE POLICY "Agents can view own tenancy communications"
ON public.tenancy_communications FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));