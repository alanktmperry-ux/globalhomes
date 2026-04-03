CREATE OR REPLACE FUNCTION public.increment_property_views(property_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE properties
  SET views = COALESCE(views, 0) + 1
  WHERE id = property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;