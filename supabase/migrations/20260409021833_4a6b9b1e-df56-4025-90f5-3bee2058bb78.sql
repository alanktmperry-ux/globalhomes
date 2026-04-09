
-- 1. Fix user_roles privilege escalation: drop permissive INSERT policy, replace with admin-only
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;

-- Only admins can assign roles (via has_role security definer function)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Fix rental-applications storage: replace bucket-only check with ownership check
DROP POLICY IF EXISTS "Authenticated users can upload rental docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view rental docs" ON storage.objects;
DROP POLICY IF EXISTS "rental_apps_insert" ON storage.objects;
DROP POLICY IF EXISTS "rental_apps_select" ON storage.objects;

-- Users can only upload to their own folder
CREATE POLICY "rental_apps_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rental-applications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can only view their own documents; agents can view via agent role
CREATE POLICY "rental_apps_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'rental-applications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'admin')
  )
);
