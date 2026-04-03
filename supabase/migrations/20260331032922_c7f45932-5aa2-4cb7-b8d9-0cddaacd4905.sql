
-- Add OAuth-related columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name   TEXT,
  ADD COLUMN IF NOT EXISTS provider    TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS onboarded   BOOLEAN DEFAULT true;

-- Update existing trigger to also sync OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_avatar TEXT;
  v_provider TEXT;
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

  INSERT INTO public.profiles (user_id, display_name, full_name, avatar_url, phone, provider, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', v_full_name),
    v_full_name,
    v_avatar,
    NEW.raw_user_meta_data->>'phone',
    v_provider,
    CASE WHEN v_provider = 'email' THEN true ELSE false END
  );

  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;
