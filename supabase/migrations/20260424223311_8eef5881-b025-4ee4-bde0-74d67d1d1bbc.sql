ALTER TABLE public.contact_custom_fields
  ADD COLUMN deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_contact_custom_fields_deleted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = false AND (OLD.is_active = true OR NEW.deleted_at IS NULL) THEN
    NEW.deleted_at := COALESCE(NEW.deleted_at, now());
  ELSIF NEW.is_active = true THEN
    NEW.deleted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contact_custom_fields_sync_deleted_at
  BEFORE INSERT OR UPDATE OF is_active ON public.contact_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.sync_contact_custom_fields_deleted_at();