CREATE TABLE IF NOT EXISTS public.email_translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload_hash text NOT NULL,
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL,
  original_subject text NOT NULL,
  original_body text NOT NULL,
  translated_subject text NOT NULL,
  translated_body text NOT NULL,
  hit_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_email_translation_cache_lookup
  ON public.email_translation_cache (payload_hash);

COMMENT ON TABLE public.email_translation_cache IS 'Caches translated email payloads so identical broadcasts dont re-call Gemini per recipient.';

ALTER TABLE public.email_translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_email_cache"
  ON public.email_translation_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);