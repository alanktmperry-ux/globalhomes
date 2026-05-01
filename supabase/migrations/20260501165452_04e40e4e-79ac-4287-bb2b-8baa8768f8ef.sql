-- PART A: Auto-translate listings when they go live
CREATE OR REPLACE FUNCTION public.trigger_auto_translate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND
      (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    IF NEW.translations IS NULL OR NEW.translations = '{}'::jsonb THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/generate-translations',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object('mode', 'full_listing', 'listing_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_published_translate ON public.properties;

CREATE TRIGGER on_listing_published_translate
  AFTER INSERT OR UPDATE OF is_active
  ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_translate();

-- PART D: Fix listings_translation_summary view to use correct JSONB keys.
-- Drop first because column types/names are changing (cannot CREATE OR REPLACE).
DROP VIEW IF EXISTS public.listings_translation_summary;

CREATE VIEW public.listings_translation_summary AS
SELECT
  id,
  title,
  suburb,
  state,
  is_active,
  (translations->>'zh_simplified') IS NOT NULL AS has_zh_simplified,
  (translations->>'zh_traditional') IS NOT NULL AS has_zh_traditional,
  (translations->>'vi') IS NOT NULL AS has_vi,
  (translations->>'ko') IS NOT NULL AS has_ko,
  (translations->>'ar') IS NOT NULL AS has_ar,
  (translations->>'hi') IS NOT NULL AS has_hi,
  (translations->>'bn') IS NOT NULL AS has_bn,
  (translations->>'pa') IS NOT NULL AS has_pa,
  (translations->>'ta') IS NOT NULL AS has_ta,
  updated_at
FROM public.properties
WHERE is_active = true;