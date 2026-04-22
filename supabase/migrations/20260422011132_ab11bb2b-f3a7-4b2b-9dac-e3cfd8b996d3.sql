-- Step 1: Create SECURITY DEFINER function that bypasses RLS
-- This breaks the circular reference agents → properties → agents
CREATE OR REPLACE FUNCTION public.get_agent_id_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.agents WHERE user_id = p_user_id LIMIT 1;
$$;

-- Step 2: Drop the problematic recursive policies
DROP POLICY IF EXISTS "Agents can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can delete own properties" ON public.properties;

-- Step 3: Recreate using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Agents can insert own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = public.get_agent_id_for_user(auth.uid())
);

CREATE POLICY "Agents can update own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  agent_id = public.get_agent_id_for_user(auth.uid())
)
WITH CHECK (
  agent_id = public.get_agent_id_for_user(auth.uid())
);

CREATE POLICY "Agents can delete own properties"
ON public.properties
FOR DELETE
TO authenticated
USING (
  agent_id = public.get_agent_id_for_user(auth.uid())
);

-- Step 4: Also fix notifications and leads while we're here
-- Allow any authenticated user to insert a notification for any agent
DROP POLICY IF EXISTS "Allow anon insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;

CREATE POLICY "Anyone can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Allow anon to insert leads (contact agent form)
DROP POLICY IF EXISTS "Anon can insert leads" ON public.leads;

CREATE POLICY "Anon can insert leads"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);