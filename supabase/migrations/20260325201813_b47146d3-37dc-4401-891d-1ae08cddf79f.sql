CREATE OR REPLACE FUNCTION public.increment_contact_clicks(property_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE properties
  SET contact_clicks = COALESCE(contact_clicks, 0) + 1
  WHERE id = property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;