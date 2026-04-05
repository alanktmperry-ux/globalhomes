
-- 1. Add multilingual columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS translations jsonb,
  ADD COLUMN IF NOT EXISTS agent_insights jsonb,
  ADD COLUMN IF NOT EXISTS translations_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS translation_status text DEFAULT 'pending';

-- 2. analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  listing_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  properties jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. buyer_language_preferences table
CREATE TABLE IF NOT EXISTS public.buyer_language_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  preferred_language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Trigger function: reset translation_status on insert/description change
CREATE OR REPLACE FUNCTION public.trigger_translation_on_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.description IS DISTINCT FROM NEW.description) THEN
    NEW.translation_status := 'pending';
    NEW.translations_generated_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_translation_on_update ON public.properties;
CREATE TRIGGER trg_translation_on_update
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_translation_on_update();

-- 5. Translation summary view
CREATE OR REPLACE VIEW public.listings_translation_summary AS
SELECT
  id,
  address,
  translation_status,
  translations_generated_at,
  (translations IS NOT NULL AND translations != '{}'::jsonb) AS has_translations,
  (translations ? 'zh-CN') AS has_mandarin,
  (translations ? 'zh-HK') AS has_cantonese,
  (translations ? 'vi') AS has_vietnamese
FROM public.properties;

-- 6. RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agents can view their own analytics"
  ON public.analytics_events FOR SELECT
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- 7. RLS on buyer_language_preferences
ALTER TABLE public.buyer_language_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert language preferences"
  ON public.buyer_language_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read language preferences"
  ON public.buyer_language_preferences FOR SELECT
  USING (true);
