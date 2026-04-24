-- 1. Enable pg_trgm for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add normalised phone columns (generated, STORED)
-- Strategy:
--   * Take COALESCE(mobile, phone)
--   * Strip everything non-digit
--   * If resulting digits length >= 9 AND last 9 starts with '4' => mobile, store last 9
--   * Else => landline, store full stripped digits
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS phone_normalized text
    GENERATED ALWAYS AS (
      CASE
        WHEN COALESCE(mobile, phone) IS NULL THEN NULL
        WHEN length(regexp_replace(COALESCE(mobile, phone), '\D', '', 'g')) >= 9
             AND substring(
               right(regexp_replace(COALESCE(mobile, phone), '\D', '', 'g'), 9)
               from 1 for 1
             ) = '4'
          THEN right(regexp_replace(COALESCE(mobile, phone), '\D', '', 'g'), 9)
        ELSE NULLIF(regexp_replace(COALESCE(mobile, phone), '\D', '', 'g'), '')
      END
    ) STORED;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS phone_is_landline boolean
    GENERATED ALWAYS AS (
      CASE
        WHEN COALESCE(mobile, phone) IS NULL THEN NULL
        WHEN length(regexp_replace(COALESCE(mobile, phone), '\D', '', 'g')) >= 9
             AND substring(
               right(regexp_replace(COALESCE(mobile, phone), '\D', '', 'g'), 9)
               from 1 for 1
             ) = '4'
          THEN false
        ELSE true
      END
    ) STORED;

-- 3. Agency-scoped lookup indexes
CREATE INDEX IF NOT EXISTS idx_contacts_agency_email_lower
  ON public.contacts (agency_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_agency_phone_norm
  ON public.contacts (agency_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_is_landline = false;

-- 4. Trigram index for fuzzy name matching
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm
  ON public.contacts
  USING gin ((lower(first_name || ' ' || COALESCE(last_name, ''))) gin_trgm_ops);

-- 5. Duplicate detection RPC
-- Returns ranked matches with method label and confidence score
CREATE OR REPLACE FUNCTION public.find_duplicate_contacts(
  p_agency_id uuid,
  p_email text DEFAULT NULL,
  p_phone_normalized text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_exclude_contact_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  mobile text,
  phone text,
  tags text[],
  communication_preferences jsonb,
  created_by uuid,
  updated_at timestamptz,
  match_method text,
  confidence numeric,
  is_owned_by_other boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_full_name text := lower(trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, '')));
BEGIN
  -- Authz: caller must be a member of the agency
  IF p_agency_id IS NULL OR v_caller IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = p_agency_id AND am.user_id = v_caller
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    -- Exact email match (case-insensitive)
    SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.phone,
           c.tags, c.communication_preferences, c.created_by, c.updated_at,
           'email'::text AS match_method,
           1.00::numeric AS confidence
    FROM public.contacts c
    WHERE c.agency_id = p_agency_id
      AND p_email IS NOT NULL
      AND c.email IS NOT NULL
      AND lower(c.email) = lower(p_email)
      AND (p_exclude_contact_id IS NULL OR c.id <> p_exclude_contact_id)

    UNION ALL

    -- Exact phone match (mobile only — landline normalisation collides too easily)
    SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.phone,
           c.tags, c.communication_preferences, c.created_by, c.updated_at,
           'phone'::text AS match_method,
           1.00::numeric AS confidence
    FROM public.contacts c
    WHERE c.agency_id = p_agency_id
      AND p_phone_normalized IS NOT NULL
      AND c.phone_normalized IS NOT NULL
      AND c.phone_is_landline = false
      AND c.phone_normalized = p_phone_normalized
      AND (p_exclude_contact_id IS NULL OR c.id <> p_exclude_contact_id)

    UNION ALL

    -- Fuzzy name match — only if phone OR address ALSO partial matches
    SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.phone,
           c.tags, c.communication_preferences, c.created_by, c.updated_at,
           'name_fuzzy'::text AS match_method,
           similarity(
             lower(c.first_name || ' ' || COALESCE(c.last_name, '')),
             v_full_name
           )::numeric AS confidence
    FROM public.contacts c
    WHERE c.agency_id = p_agency_id
      AND v_full_name <> ''
      AND length(v_full_name) >= 3
      AND similarity(
            lower(c.first_name || ' ' || COALESCE(c.last_name, '')),
            v_full_name
          ) >= 0.80
      AND (
        -- phone partial: same last 4 digits of normalised phone
        (p_phone_normalized IS NOT NULL
         AND c.phone_normalized IS NOT NULL
         AND right(c.phone_normalized, 4) = right(p_phone_normalized, 4))
        OR
        -- address partial: trigram similarity on address >= 0.4
        (p_address IS NOT NULL
         AND c.address IS NOT NULL
         AND similarity(lower(c.address), lower(p_address)) >= 0.40)
      )
      AND (p_exclude_contact_id IS NULL OR c.id <> p_exclude_contact_id)
  ),
  ranked AS (
    SELECT DISTINCT ON (id)
      id, first_name, last_name, email, mobile, phone,
      tags, communication_preferences, created_by, updated_at,
      match_method, confidence
    FROM candidates
    ORDER BY id,
             CASE match_method
               WHEN 'email' THEN 1
               WHEN 'phone' THEN 2
               WHEN 'name_fuzzy' THEN 3
             END,
             confidence DESC
  )
  SELECT
    r.id, r.first_name, r.last_name, r.email, r.mobile, r.phone,
    r.tags, r.communication_preferences, r.created_by, r.updated_at,
    r.match_method, r.confidence,
    (r.created_by <> v_caller) AS is_owned_by_other
  FROM ranked r
  ORDER BY
    CASE r.match_method
      WHEN 'email' THEN 1
      WHEN 'phone' THEN 2
      WHEN 'name_fuzzy' THEN 3
    END,
    r.confidence DESC,
    r.updated_at DESC
  LIMIT 3;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_duplicate_contacts(uuid, text, text, text, text, text, uuid) TO authenticated;

-- 6. Telemetry table for duplicate detection events
CREATE TABLE IF NOT EXISTS public.contact_duplicate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id uuid NOT NULL,
  agency_id uuid,
  action text NOT NULL CHECK (action IN ('suggested', 'accepted', 'created_anyway', 'ignored', 'blocked_at_save', 'soft_warned')),
  match_method text CHECK (match_method IN ('email', 'phone', 'name_fuzzy', 'mixed')),
  match_count integer NOT NULL DEFAULT 0,
  suggested_contact_ids uuid[] NOT NULL DEFAULT '{}',
  accepted_contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_dup_events_agent_created
  ON public.contact_duplicate_events (agent_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_dup_events_agency_action
  ON public.contact_duplicate_events (agency_id, action, created_at DESC);

ALTER TABLE public.contact_duplicate_events ENABLE ROW LEVEL SECURITY;

-- Insert: any authenticated user can log their own events
CREATE POLICY "Users can log their own duplicate events"
  ON public.contact_duplicate_events
  FOR INSERT
  TO authenticated
  WITH CHECK (agent_user_id = auth.uid());

-- Select: only the agent themselves OR agency admins can read
CREATE POLICY "Users can read their own duplicate events"
  ON public.contact_duplicate_events
  FOR SELECT
  TO authenticated
  USING (agent_user_id = auth.uid());

CREATE POLICY "Agency admins can read agency duplicate events"
  ON public.contact_duplicate_events
  FOR SELECT
  TO authenticated
  USING (
    agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = contact_duplicate_events.agency_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );