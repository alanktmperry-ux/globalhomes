-- Admin impersonation sessions tracked server-side instead of sessionStorage
CREATE TABLE public.admin_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_user_id uuid NOT NULL,
  impersonated_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE INDEX idx_admin_imp_admin_active
  ON public.admin_impersonation_sessions (admin_id, expires_at DESC);

ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Helper to check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- Admins may read their own impersonation sessions
CREATE POLICY "Admins read own impersonation sessions"
ON public.admin_impersonation_sessions
FOR SELECT
TO authenticated
USING (admin_id = auth.uid() AND public.is_admin(auth.uid()));

-- Admins may create their own impersonation sessions
CREATE POLICY "Admins create own impersonation sessions"
ON public.admin_impersonation_sessions
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() AND public.is_admin(auth.uid()));

-- Admins may delete their own impersonation sessions
CREATE POLICY "Admins delete own impersonation sessions"
ON public.admin_impersonation_sessions
FOR DELETE
TO authenticated
USING (admin_id = auth.uid() AND public.is_admin(auth.uid()));