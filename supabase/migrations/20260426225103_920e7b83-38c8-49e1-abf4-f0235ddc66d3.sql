-- 1. Add user_role column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_role TEXT
  CHECK (user_role IN ('buyer','renter','agent','property_manager'));

CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);

-- 2. One-time auto-approval of existing agents with confirmed email,
--    excluding demo accounts and previously rejected applications.
UPDATE public.agents
SET is_approved = true,
    approval_status = 'approved',
    updated_at = now()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
  )
  AND COALESCE(is_demo, false) = false
  AND COALESCE(approval_status, 'pending') <> 'rejected'
  AND (is_approved IS NULL OR is_approved = false OR approval_status <> 'approved');

-- 3. Trigger: when an auth.users row gets its email_confirmed_at set,
--    automatically approve any matching agent record (skip demo + rejected).
CREATE OR REPLACE FUNCTION public.auto_approve_agent_on_email_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.agents
       SET is_approved = true,
           approval_status = 'approved',
           updated_at = now()
     WHERE user_id = NEW.id
       AND COALESCE(is_demo, false) = false
       AND COALESCE(approval_status, 'pending') <> 'rejected'
       AND (is_approved IS NULL OR is_approved = false OR approval_status <> 'approved');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_agent_on_email_confirm ON auth.users;
CREATE TRIGGER trg_auto_approve_agent_on_email_confirm
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_agent_on_email_confirm();