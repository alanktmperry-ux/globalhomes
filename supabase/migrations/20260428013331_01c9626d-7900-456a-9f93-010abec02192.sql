CREATE TABLE IF NOT EXISTS public.pm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  category text NOT NULL,
  title text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_pm_documents_agent ON public.pm_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_documents_tenancy ON public.pm_documents(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_pm_documents_property ON public.pm_documents(property_id);

ALTER TABLE public.pm_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own pm documents"
  ON public.pm_documents FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents insert own pm documents"
  ON public.pm_documents FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents update own pm documents"
  ON public.pm_documents FOR UPDATE
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents delete own pm documents"
  ON public.pm_documents FOR DELETE
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-docs', 'property-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents can upload property docs to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can read own property docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can delete own property docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.agents WHERE user_id = auth.uid()
    )
  );