ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_locale_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_locale_check
      CHECK (locale IN ('en','zh','vi','ko','ar','hi','ja','it','de','es','fr','pt','ru','th','id','fil','el','pl','ne','tr','fa','uk','my','km'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_locale ON public.profiles(locale);

COMMENT ON COLUMN public.profiles.locale IS 'User preferred locale (ISO 639-1). Used by translation services to deliver content in user language. Set at signup from browser language, updatable from account settings.';

-- Update the new-user trigger to capture locale from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name TEXT;
  v_avatar TEXT;
  v_provider TEXT;
  v_locale TEXT;
  v_allowed TEXT[] := ARRAY['en','zh','vi','ko','ar','hi','ja','it','de','es','fr','pt','ru','th','id','fil','el','pl','ne','tr','fa','uk','my','km'];
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'given_name','') || ' ' || COALESCE(NEW.raw_user_meta_data->>'family_name','')), ''),
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- Resolve locale from signup metadata; fall back to 'en' if missing/unsupported
  v_locale := LOWER(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'locale',''), '-', 1));
  IF v_locale IS NULL OR v_locale = '' OR NOT (v_locale = ANY(v_allowed)) THEN
    v_locale := 'en';
  END IF;

  INSERT INTO public.profiles (user_id, display_name, full_name, avatar_url, phone, provider, onboarded, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', v_full_name),
    v_full_name,
    v_avatar,
    NEW.raw_user_meta_data->>'phone',
    v_provider,
    CASE WHEN v_provider = 'email' THEN true ELSE false END,
    v_locale
  );

  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;