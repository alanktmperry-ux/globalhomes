
-- Add moderation_status column
ALTER TABLE public.properties
ADD COLUMN moderation_status text NOT NULL DEFAULT 'pending';

-- Set all existing listings to approved so they remain visible
UPDATE public.properties SET moderation_status = 'approved' WHERE moderation_status = 'pending';

-- Create validation trigger
CREATE OR REPLACE FUNCTION public.validate_moderation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.moderation_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid moderation_status: %', NEW.moderation_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_moderation_status
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.validate_moderation_status();
