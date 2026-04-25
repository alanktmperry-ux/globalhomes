-- 1. Per-agency config (fuzzy threshold)
CREATE TABLE public.dedup_config (
  agency_id UUID NOT NULL PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  fuzzy_threshold NUMERIC NOT NULL DEFAULT 0.80 CHECK (fuzzy_threshold >= 0 AND fuzzy_threshold <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.dedup_config ENABLE ROW LEVEL SECURITY;

-- 2. Helper: is the caller a principal/owner/admin within an agency?
CREATE OR REPLACE FUNCTION public.is_agency_principal(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.user_id = _user_id
      AND am.agency_id = _agency_id
      AND am.role IN ('owner','principal','admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_agency_principal(UUID, UUID) TO authenticated;

-- 3. Policies
CREATE POLICY "Principals & platform admins can read dedup_config"
ON public.dedup_config FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_agency_principal(auth.uid(), agency_id)
);

CREATE POLICY "Principals & platform admins can upsert dedup_config"
ON public.dedup_config FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_agency_principal(auth.uid(), agency_id)
);

CREATE POLICY "Principals & platform admins can update dedup_config"
ON public.dedup_config FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_agency_principal(auth.uid(), agency_id)
);

-- 4. Persist similarity score with each telemetry event
ALTER TABLE public.contact_duplicate_events
  ADD COLUMN IF NOT EXISTS similarity_score NUMERIC;

-- Allow principals/admins to view the agency's dedup events
CREATE POLICY "Principals & platform admins can read dedup events"
ON public.contact_duplicate_events FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (agency_id IS NOT NULL AND public.is_agency_principal(auth.uid(), agency_id))
);

-- 5. Replace find_duplicate_contacts to read per-agency threshold
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_full_name text := lower(trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, '')));
  v_threshold numeric;
BEGIN
  IF p_agency_id IS NULL OR v_caller IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = p_agency_id AND am.user_id = v_caller) THEN RETURN; END IF;

  SELECT COALESCE(fuzzy_threshold, 0.80) INTO v_threshold FROM public.dedup_config WHERE agency_id = p_agency_id;
  v_threshold := COALESCE(v_threshold, 0.80);

  RETURN QUERY
  WITH candidates AS (
    SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.phone,
           c.tags, c.communication_preferences, c.created_by, c.updated_at,
           'email'::text AS match_method, 1.00::numeric AS confidence
    FROM public.contacts c
    WHERE c.agency_id = p_agency_id
      AND p_email IS NOT NULL AND c.email IS NOT NULL
      AND lower(c.email) = lower(p_email)
      AND (p_exclude_contact_id IS NULL OR c.id <> p_exclude_contact_id)
    UNION ALL
    SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.phone,
           c.tags, c.communication_preferences, c.created_by, c.updated_at,
           'phone'::text, 1.00::numeric
    FROM public.contacts c
    WHERE c.agency_id = p_agency_id
      AND p_phone_normalized IS NOT NULL AND c.phone_normalized IS NOT NULL
      AND c.phone_is_landline = false
      AND c.phone_normalized = p_phone_normalized
      AND (p_exclude_contact_id IS NULL OR c.id <> p_exclude_contact_id)
    UNION ALL
    SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.phone,
           c.tags, c.communication_preferences, c.created_by, c.updated_at,
           'name_fuzzy'::text,
           similarity(lower(c.first_name || ' ' || COALESCE(c.last_name, '')), v_full_name)::numeric
    FROM public.contacts c
    WHERE c.agency_id = p_agency_id
      AND v_full_name <> '' AND length(v_full_name) >= 3
      AND similarity(lower(c.first_name || ' ' || COALESCE(c.last_name, '')), v_full_name) >= v_threshold
      AND (
        (p_phone_normalized IS NOT NULL AND c.phone_normalized IS NOT NULL
         AND right(c.phone_normalized, 4) = right(p_phone_normalized, 4))
        OR (p_address IS NOT NULL AND c.address IS NOT NULL
            AND similarity(lower(c.address), lower(p_address)) >= 0.40)
      )
      AND (p_exclude_contact_id IS NULL OR c.id <> p_exclude_contact_id)
  ),
  ranked AS (
    SELECT DISTINCT ON (id) id, first_name, last_name, email, mobile, phone,
      tags, communication_preferences, created_by, updated_at, match_method, confidence
    FROM candidates
    ORDER BY id,
      CASE match_method WHEN 'email' THEN 1 WHEN 'phone' THEN 2 WHEN 'name_fuzzy' THEN 3 END,
      confidence DESC
  )
  SELECT r.id, r.first_name, r.last_name, r.email, r.mobile, r.phone,
    r.tags, r.communication_preferences, r.created_by, r.updated_at,
    r.match_method, r.confidence, (r.created_by <> v_caller) AS is_owned_by_other
  FROM ranked r
  ORDER BY
    CASE r.match_method WHEN 'email' THEN 1 WHEN 'phone' THEN 2 WHEN 'name_fuzzy' THEN 3 END,
    r.confidence DESC, r.updated_at DESC
  LIMIT 3;
END;
$$;
GRANT EXECUTE ON FUNCTION public.find_duplicate_contacts(uuid, text, text, text, text, text, uuid) TO authenticated;