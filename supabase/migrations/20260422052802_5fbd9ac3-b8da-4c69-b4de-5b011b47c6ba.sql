
CREATE OR REPLACE FUNCTION public.accept_broker_invite(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite RECORD;
  v_user_email TEXT;
  v_broker_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_invite
  FROM public.broker_agency_invites
  WHERE token = _token AND accepted_at IS NULL
  LIMIT 1;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found or already accepted';
  END IF;

  IF lower(v_invite.email) <> lower(v_user_email) THEN
    RAISE EXCEPTION 'This invite is for a different email address';
  END IF;

  -- Reuse an existing broker record for this user, otherwise create one
  SELECT id INTO v_broker_id FROM public.brokers WHERE auth_user_id = v_user_id LIMIT 1;

  IF v_broker_id IS NULL THEN
    INSERT INTO public.brokers (
      auth_user_id, email, name, full_name, acl_number, agency_id, agency_role, is_active
    ) VALUES (
      v_user_id,
      v_user_email,
      COALESCE(v_invite.full_name, split_part(v_user_email, '@', 1)),
      v_invite.full_name,
      'PENDING',
      v_invite.agency_id,
      'associate',
      true
    )
    RETURNING id INTO v_broker_id;
  ELSE
    UPDATE public.brokers
    SET agency_id = v_invite.agency_id, agency_role = 'associate'
    WHERE id = v_broker_id;
  END IF;

  UPDATE public.broker_agency_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN v_broker_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_broker_invite(TEXT) TO authenticated;
