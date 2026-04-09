
-- 1. Properties: restrict public SELECT to active listings only
DROP POLICY IF EXISTS "Properties viewable by everyone" ON public.properties;

CREATE POLICY "Public read active properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR vendor_id = auth.uid()
);

-- 2. Review requests: remove open SELECT, replace with agent-only
DROP POLICY IF EXISTS "Anyone can read review request by token" ON public.review_requests;

CREATE POLICY "Lookup review request by token"
ON public.review_requests
FOR SELECT
TO anon, authenticated
USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- Safe anonymous token lookup function
CREATE OR REPLACE FUNCTION public.lookup_review_request_by_token(p_token text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', id,
    'agent_id', agent_id,
    'client_name', client_name,
    'used', used,
    'expires_at', expires_at
  )
  FROM review_requests
  WHERE token = p_token
    AND used = false
    AND expires_at > now();
$$;

-- 3. Agents: replace broad public SELECT
DROP POLICY IF EXISTS "Public can view agent profiles" ON public.agents;

CREATE POLICY "Public view agent profiles safe"
ON public.agents
FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (is_subscribed = true AND COALESCE(is_public_profile, true) = true)
);

-- 4. Storage: scope DELETE/UPDATE for avatars and agency-logos

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own agency logos" ON storage.objects;
CREATE POLICY "Users can delete own agency logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agency-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own agency logos" ON storage.objects;
CREATE POLICY "Users can update own agency logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'agency-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
