CREATE TABLE public.careers_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_applied TEXT NOT NULL CHECK (role_applied IN (
    'founding-engineer','founding-designer','head-of-growth','agency-sales-lead','customer-success-lead','general'
  )),
  linkedin_url TEXT NOT NULL,
  portfolio_url TEXT,
  location TEXT NOT NULL,
  why_listhq TEXT NOT NULL CHECK (char_length(why_listhq) <= 500),
  cv_storage_path TEXT,
  has_work_rights BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','interview','rejected','hired')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_careers_applications_status ON public.careers_applications(status);
CREATE INDEX idx_careers_applications_role ON public.careers_applications(role_applied);
CREATE INDEX idx_careers_applications_created_at ON public.careers_applications(created_at DESC);

ALTER TABLE public.careers_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can apply" ON public.careers_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins read applications" ON public.careers_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update applications" ON public.careers_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('careers-uploads', 'careers-uploads', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can upload CV" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'careers-uploads'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

CREATE POLICY "Admins read CVs" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'careers-uploads'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
