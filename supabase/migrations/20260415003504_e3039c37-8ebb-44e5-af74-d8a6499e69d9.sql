-- Add approval_status column with default 'pending'
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Set all existing agents to 'approved' so they are not disrupted
UPDATE public.agents SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Create validation trigger (not a CHECK constraint, per project guidelines)
CREATE OR REPLACE FUNCTION public.validate_agent_approval_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.approval_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_approval_status
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_agent_approval_status();

-- Add index for admin queue queries
CREATE INDEX IF NOT EXISTS idx_agents_approval_status ON public.agents (approval_status);