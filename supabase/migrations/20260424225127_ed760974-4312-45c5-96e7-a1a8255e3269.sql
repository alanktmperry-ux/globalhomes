-- Add communication_preferences JSONB column to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS communication_preferences JSONB NOT NULL DEFAULT '[]'::jsonb;

-- GIN index for future channel filtering
CREATE INDEX IF NOT EXISTS idx_contacts_communication_preferences
  ON public.contacts USING GIN (communication_preferences);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_communication_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefs        JSONB := COALESCE(NEW.communication_preferences, '[]'::jsonb);
  v_count        INT;
  v_primary_cnt  INT;
  v_item         JSONB;
  v_channel      TEXT;
  v_handle       TEXT;
  v_allowed      TEXT[] := ARRAY['email','sms','whatsapp','phone','wechat','line','in_app'];
BEGIN
  -- Must be a JSON array
  IF jsonb_typeof(v_prefs) <> 'array' THEN
    RAISE EXCEPTION 'communication_preferences must be a JSON array';
  END IF;

  v_count := jsonb_array_length(v_prefs);

  -- Empty array is valid; skip remaining checks
  IF v_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Cap at 5
  IF v_count > 5 THEN
    RAISE EXCEPTION 'A contact can have at most 5 communication preferences (got %)', v_count;
  END IF;

  -- Validate each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_prefs) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Each communication preference must be an object';
    END IF;

    v_channel := v_item->>'channel';
    v_handle  := v_item->>'handle';

    IF v_channel IS NULL OR NOT (v_channel = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Invalid communication channel: %. Allowed: %', v_channel, v_allowed;
    END IF;

    IF v_handle IS NULL OR length(trim(v_handle)) = 0 THEN
      RAISE EXCEPTION 'Communication preference handle cannot be empty (channel: %)', v_channel;
    END IF;

    -- Handle format checks
    IF v_channel = 'email' THEN
      IF v_handle !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'Invalid email handle: %', v_handle;
      END IF;
    ELSIF v_channel IN ('sms','whatsapp','phone','wechat','line') THEN
      -- Permissive phone-ish: digits, spaces, +, -, (), at least 6 digits total
      IF v_handle !~ '^[\d\s+\-\(\)]{6,}$' THEN
        RAISE EXCEPTION 'Invalid phone-style handle for channel %: %', v_channel, v_handle;
      END IF;
    END IF;
    -- in_app: any non-empty string is OK
  END LOOP;

  -- Exactly one primary
  SELECT COUNT(*) INTO v_primary_cnt
  FROM jsonb_array_elements(v_prefs) elem
  WHERE (elem->>'is_primary')::boolean IS TRUE;

  IF v_primary_cnt <> 1 THEN
    RAISE EXCEPTION 'Exactly one communication preference must be marked is_primary=true (got %)', v_primary_cnt;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_communication_preferences ON public.contacts;
CREATE TRIGGER trg_validate_communication_preferences
  BEFORE INSERT OR UPDATE OF communication_preferences ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_communication_preferences();