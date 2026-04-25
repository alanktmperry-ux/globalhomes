CREATE OR REPLACE FUNCTION public.message_templates_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.body_by_language IS NULL OR NEW.body_by_language = '{}'::jsonb THEN
    RAISE EXCEPTION 'body_by_language must include at least an English (en) entry';
  END IF;
  IF NOT (NEW.body_by_language ? 'en') OR coalesce(btrim(NEW.body_by_language->>'en'),'') = '' THEN
    RAISE EXCEPTION 'English (en) body is required';
  END IF;
  IF NEW.channel = 'email' THEN
    IF NEW.subject_by_language IS NULL OR NOT (NEW.subject_by_language ? 'en') OR coalesce(btrim(NEW.subject_by_language->>'en'),'') = '' THEN
      RAISE EXCEPTION 'Email templates require an English (en) subject';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;