DROP VIEW IF EXISTS public.listings_translation_summary;

CREATE VIEW public.listings_translation_summary AS
SELECT
  id,
  title,
  suburb,
  is_active,
  (translations IS NOT NULL AND translations != '{}'::jsonb) AS has_translations,
  (translations ? 'zh_simplified') AS has_zh_simplified,
  (translations ? 'zh_traditional') AS has_zh_traditional,
  (translations ? 'vi') AS has_vi,
  (translations ? 'ko') AS has_ko,
  (translations ? 'ar') AS has_ar,
  (translations ? 'ja') AS has_ja,
  (translations ? 'hi') AS has_hi,
  (translations ? 'pa') AS has_pa,
  (translations ? 'ta') AS has_ta,
  (translations ? 'bn') AS has_bn,
  translations
FROM public.properties;