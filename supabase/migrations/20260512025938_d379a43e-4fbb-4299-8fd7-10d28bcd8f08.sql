CREATE OR REPLACE FUNCTION public.increment_email_cache_hit(p_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_translation_cache
  SET hit_count = hit_count + 1,
      last_used_at = now()
  WHERE payload_hash = p_hash;
$$;

REVOKE ALL ON FUNCTION public.increment_email_cache_hit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_email_cache_hit(text) TO service_role;