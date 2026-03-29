-- Prevent deactivating/deleting properties with active tenancies (database-level safety net)
CREATE OR REPLACE FUNCTION public.check_property_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check when is_active is being set to false
  IF NEW.is_active = false AND OLD.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM public.tenancies
      WHERE property_id = OLD.id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Cannot deactivate listing with an active tenancy. End the tenancy first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_property_deactivation
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.check_property_deactivation();

-- Also prevent deletion of properties with active tenancies
CREATE OR REPLACE FUNCTION public.check_property_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.tenancies
    WHERE property_id = OLD.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot delete listing with an active tenancy. End the tenancy first.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_property_deletion
BEFORE DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.check_property_deletion();