CREATE TABLE IF NOT EXISTS translate_email_cache (
  cache_key text PRIMARY KEY,
  language text NOT NULL,
  translated_subject text,
  translated_body_html text,
  translated_body_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_translate_email_cache_expires
ON translate_email_cache (expires_at);

COMMENT ON TABLE translate_email_cache IS
  'Phase 2 multilingual. Caches Google-Translate output for transactional emails by content-hash + language to avoid duplicate API calls when the same email is sent to many users.';

ALTER TABLE translate_email_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - no client access"
ON translate_email_cache
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);