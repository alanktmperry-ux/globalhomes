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
      PERFORM
        net.http_post(
          url := current_setting('app.supabase_url', true) || '/functions/v1/generate-translations',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
          ),
          body := jsonb_build_object('property_id', NEW.id)
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_published_translate ON public.properties;
DROP TRIGGER IF EXISTS on_listing_published_translate ON public.properties;

CREATE TRIGGER on_property_published_translate
  AFTER INSERT OR UPDATE OF is_active
  ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_translate();