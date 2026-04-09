
DROP POLICY IF EXISTS "Agents readable by owner or public subscribed" ON public.agents;
DROP POLICY IF EXISTS "Public can view agent profiles safe" ON public.agents;
DROP POLICY IF EXISTS "Public view agent profiles safe" ON public.agents;
DROP POLICY IF EXISTS "Public can view agent profiles" ON public.agents;
DROP POLICY IF EXISTS "Agents viewable by everyone" ON public.agents;
DROP POLICY IF EXISTS "Agents select policy" ON public.agents;

CREATE POLICY "Agents select policy" ON public.agents
FOR SELECT TO anon, authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR is_approved = true
  OR is_subscribed = true
);
