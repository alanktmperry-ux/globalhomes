CREATE OR REPLACE FUNCTION public.fill_message_translation_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.original_body IS NULL THEN
    NEW.original_body := NEW.content;
  END IF;
  IF NEW.original_lang IS NULL THEN
    NEW.original_lang := 'en';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_fill_translation_defaults ON public.messages;
CREATE TRIGGER messages_fill_translation_defaults
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_message_translation_defaults();
