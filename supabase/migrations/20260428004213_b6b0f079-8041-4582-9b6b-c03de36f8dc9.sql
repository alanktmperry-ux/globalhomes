CREATE OR REPLACE FUNCTION public.admin_moderate_listing(
  listing_id UUID,
  new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'email') NOT IN (
    'alanktmperry@gmail.com',
    'alan@everythingco.com.au',
    'alan@everythingeco.com.au'
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE properties
  SET moderation_status = new_status
  WHERE id = listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_moderate_listing(UUID, TEXT) TO authenticated;