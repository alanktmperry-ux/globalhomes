CREATE OR REPLACE FUNCTION public.fill_notification_translation_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.original_title IS NULL OR NEW.original_title = '' THEN
    NEW.original_title := COALESCE(NEW.title, '');
  END IF;
  IF NEW.original_body IS NULL OR NEW.original_body = '' THEN
    NEW.original_body := COALESCE(NEW.message, '');
  END IF;
  IF NEW.original_lang IS NULL OR NEW.original_lang = '' THEN
    NEW.original_lang := 'en';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_fill_translation_defaults ON public.notifications;
CREATE TRIGGER notifications_fill_translation_defaults
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.fill_notification_translation_defaults();