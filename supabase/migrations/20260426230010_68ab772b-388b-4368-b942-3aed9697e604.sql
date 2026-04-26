UPDATE public.agents
SET
  is_approved = true,
  approval_status = CASE
    WHEN approval_status IS NULL OR approval_status = 'pending' THEN 'approved'
    ELSE approval_status
  END,
  updated_at = now()
WHERE
  user_id IN (
    SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
  )
  AND (is_demo IS NULL OR is_demo = false)
  AND (approval_status IS NULL OR approval_status != 'rejected')
  AND (onboarding_complete = true OR onboarding_complete IS NULL)
  AND (is_approved IS NULL OR is_approved = false);