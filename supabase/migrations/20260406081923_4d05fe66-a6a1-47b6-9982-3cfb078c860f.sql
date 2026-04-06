
-- Fix 1: PRIVILEGE ESCALATION - Remove self-service INSERT on user_roles
-- Users should never be able to assign themselves any role directly.
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;

-- Fix 2: EXPOSED SENSITIVE DATA - Drop overly permissive storage policy
-- "Agents can view application docs" allows ANY authenticated user to read
-- all rental application files. The more specific policies remain.
DROP POLICY IF EXISTS "Agents can view application docs" ON storage.objects;

-- Fix 3: SECURITY DEFINER VIEW - consumer_profiles_marketplace
-- Recreate with security_invoker = on so RLS of querying user applies.
DROP VIEW IF EXISTS public.consumer_profiles_marketplace;
CREATE VIEW public.consumer_profiles_marketplace
WITH (security_invoker = on)
AS
SELECT
  id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_purchases lp
      JOIN agents a ON a.id = lp.agent_id
      WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
    ) THEN name
    ELSE 'Verified Buyer'
  END AS name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM lead_purchases lp
      JOIN agents a ON a.id = lp.agent_id
      WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
    ) THEN email
    ELSE NULL::text
  END AS email,
  buying_situation,
  budget_min,
  budget_max,
  preferred_suburbs,
  preferred_type,
  min_bedrooms,
  lead_score,
  is_purchasable,
  created_at
FROM consumer_profiles cp
WHERE is_purchasable = true
   OR user_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM lead_purchases lp
     JOIN agents a ON a.id = lp.agent_id
     WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
   );
