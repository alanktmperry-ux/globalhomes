-- Tighten lead_purchases: only service role should insert (drop permissive policy, service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can insert purchases" ON public.lead_purchases;

-- Tighten notifications: only service role / triggers should insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Tighten consumer_profiles: only service role should update
DROP POLICY IF EXISTS "Service role can update consumer profiles" ON public.consumer_profiles;

-- Deduplicate agent_reviews insert policies (keep one, restrict to authenticated)
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.agent_reviews;
DROP POLICY IF EXISTS "Anyone can submit review" ON public.agent_reviews;
CREATE POLICY "Authenticated users can submit reviews"
ON public.agent_reviews FOR INSERT TO authenticated
WITH CHECK (true);
