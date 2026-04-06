
-- Fix: listings_translation_summary - recreate with security_invoker
DROP VIEW IF EXISTS public.listings_translation_summary;
CREATE VIEW public.listings_translation_summary
WITH (security_invoker = on)
AS
SELECT
  id,
  address,
  translation_status,
  translations_generated_at,
  (translations IS NOT NULL AND translations <> '{}'::jsonb) AS has_translations,
  (translations ? 'zh-CN') AS has_mandarin,
  (translations ? 'zh-HK') AS has_cantonese,
  (translations ? 'vi') AS has_vietnamese
FROM properties;
