CREATE TABLE IF NOT EXISTS public.agent_lifecycle_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  note text NOT NULL,
  author_name text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_lifecycle_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lifecycle notes"
  ON public.agent_lifecycle_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'trial';