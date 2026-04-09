
DROP POLICY IF EXISTS "Public can view agent profiles safe" ON public.agents;
DROP POLICY IF EXISTS "Public view agent profiles safe" ON public.agents;
DROP POLICY IF EXISTS "Public can view agent profiles" ON public.agents;
DROP POLICY IF EXISTS "Agents readable by owner or public subscribed" ON public.agents;

CREATE POLICY "Agents readable by owner or public subscribed" ON public.agents
FOR SELECT TO anon, authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR (is_subscribed = true AND COALESCE(is_public_profile, true) = true)
  OR id IN (
    SELECT agent_id FROM public.properties WHERE is_active = true
  )
);
