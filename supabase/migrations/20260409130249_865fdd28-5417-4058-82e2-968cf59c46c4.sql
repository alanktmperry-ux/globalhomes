-- Revoke public access to reviewer_email on agent_reviews
REVOKE SELECT (reviewer_email) ON public.agent_reviews FROM anon, authenticated;

-- Grant reviewer_email access only to the agent who owns the review (for moderation dashboard)
-- They can access it via the existing agent-scoped SELECT policy
GRANT SELECT (reviewer_email) ON public.agent_reviews TO authenticated;