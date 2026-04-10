-- Revoke SELECT on reviewer_email from public roles
-- This prevents anon/authenticated from reading the column via the public SELECT policies
REVOKE SELECT (reviewer_email) ON public.agent_reviews FROM anon, authenticated;

-- Re-grant SELECT on all OTHER columns to anon and authenticated
-- (Postgres column-level GRANT is additive, so we grant only the safe columns)
GRANT SELECT (
  id, agent_id, created_at, helpful_count, rating, relationship,
  replied_at, reply_text, review_text, review_type, reviewer_name,
  status, submitted_by, suburb, title, verified, year_of_service
) ON public.agent_reviews TO anon, authenticated;