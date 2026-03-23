CREATE TABLE IF NOT EXISTS public.agent_lifecycle_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  note text NOT NULL,
  author_name text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_lifecycle_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage lifecycle notes' AND tablename = 'agent_lifecycle_notes') THEN
    CREATE POLICY "Admins manage lifecycle notes" ON public.agent_lifecycle_notes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS lead_source text;

DO $$ BEGIN
  ALTER TABLE public.agents ADD COLUMN lifecycle_stage text DEFAULT 'trial' CHECK (lifecycle_stage IN ('trial','active','at_risk','churned','converted'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;