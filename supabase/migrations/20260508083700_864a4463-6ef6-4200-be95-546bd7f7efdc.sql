CREATE OR REPLACE FUNCTION public.get_listing_save_stats(_property_id uuid)
RETURNS TABLE(save_count bigint, recent_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agent_id uuid;
BEGIN
  SELECT agent_id INTO _agent_id FROM properties WHERE id = _property_id;
  IF _agent_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM agents WHERE id = _agent_id AND user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT
      COUNT(*)::bigint AS save_count,
      COUNT(*) FILTER (WHERE saved_at > now() - interval '7 days')::bigint AS recent_count
    FROM saved_properties
    WHERE property_id = _property_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_save_stats(uuid) TO authenticated;