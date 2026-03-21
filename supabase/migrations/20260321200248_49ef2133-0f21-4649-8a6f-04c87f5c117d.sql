ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS boost_expiry_warned BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.reset_boost_expiry_warned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true AND OLD.is_featured = false THEN
    NEW.boost_expiry_warned := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_boost_activated
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_boost_expiry_warned();