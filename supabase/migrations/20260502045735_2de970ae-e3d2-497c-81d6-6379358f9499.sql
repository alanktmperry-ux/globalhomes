-- Fix 1: user_roles privilege escalation
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;

CREATE POLICY "users_insert_own_safe_role" ON public.user_roles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND role IN ('agent', 'user')
  );

-- Fix 2: notifications anonymous insert
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

CREATE POLICY "notifications_insert_own_agent" ON public.notifications
  FOR INSERT WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Fix 3: listing_documents cross-agent injection
DROP POLICY IF EXISTS "Agents can insert listing documents" ON public.listing_documents;

CREATE POLICY "listing_documents_insert_own_property" ON public.listing_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND property_id IN (
      SELECT id FROM public.properties
      WHERE agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );

-- Fix 4: trust_transactions stale weak policies
DROP POLICY IF EXISTS "Agents can insert trust transactions" ON public.trust_transactions;
DROP POLICY IF EXISTS "Agents can update own trust transactions" ON public.trust_transactions;

-- Fix 5: agency_members public exposure
DROP POLICY IF EXISTS "Public can view agency members" ON public.agency_members;