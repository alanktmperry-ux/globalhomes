CREATE TABLE IF NOT EXISTS public.compliance_archive_users (
  source_user_id  UUID PRIMARY KEY,
  archive_user_id UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.compliance_archive_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_compliance_archive" ON public.compliance_archive_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );