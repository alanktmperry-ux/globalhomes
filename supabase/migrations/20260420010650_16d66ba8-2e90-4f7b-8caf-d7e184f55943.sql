CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_session_ids text[];
BEGIN
  SELECT id INTO v_agent_id FROM public.agents WHERE user_id = p_user_id LIMIT 1;

  -- Existing user-scoped cleanups (preserve prior behaviour: best-effort, ignore missing tables)
  BEGIN DELETE FROM public.activities WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.notifications WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.saved_properties WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.saved_searches WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.buyer_profiles WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.buyer_pre_approvals WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.profiles WHERE id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.profiles WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.user_roles WHERE user_id = p_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- AI matching system cleanup (added)
  BEGIN
    SELECT COALESCE(array_agg(session_id), ARRAY[]::text[])
    INTO v_session_ids
    FROM public.buyer_intent
    WHERE buyer_id = p_user_id AND session_id IS NOT NULL;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_session_ids := ARRAY[]::text[];
  END;

  IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
    BEGIN
      DELETE FROM public.listing_buyer_matches WHERE buyer_session_id = ANY(v_session_ids);
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
    END;
  END IF;

  BEGIN DELETE FROM public.buyer_intent WHERE buyer_id = p_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.buyer_activity_events WHERE buyer_id = p_user_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Agent cleanup (final)
  IF v_agent_id IS NOT NULL THEN
    BEGIN DELETE FROM public.agents WHERE id = v_agent_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;
END;
$$;