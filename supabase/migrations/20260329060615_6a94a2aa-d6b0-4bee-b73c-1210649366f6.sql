
-- Legal Item 1: Terms acceptance tracking on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0';

-- Legal Item 6: 7-year tenancy record retention trigger
CREATE OR REPLACE FUNCTION public.prevent_tenancy_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.created_at > NOW() - INTERVAL '7 years' THEN
    RAISE EXCEPTION 'Tenancy records cannot be deleted within 7 years of creation (Australian tenancy law compliance).';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER enforce_tenancy_retention
BEFORE DELETE ON public.tenancies
FOR EACH ROW EXECUTE FUNCTION public.prevent_tenancy_deletion();
