-- 1. Add submitted_by column to track actual submitter
ALTER TABLE public.agent_reviews
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- 2. Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.agent_reviews;

-- 3. Create a tightened INSERT policy
CREATE POLICY "Authenticated users can submit reviews"
ON public.agent_reviews
FOR INSERT TO authenticated
WITH CHECK (
  -- Must identify themselves
  submitted_by = auth.uid()
  -- Status must be pending (no self-approving)
  AND status = 'pending'
  -- Cannot review your own agent profile
  AND NOT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_id AND a.user_id = auth.uid()
  )
);