
-- Drop the permissive anon update policy
DROP POLICY IF EXISTS "Public can sign via token" ON public.signature_request_parties;

-- Create a security definer function for signing
CREATE OR REPLACE FUNCTION public.sign_document(p_token uuid, p_signature_data text, p_ip_address text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_party RECORD;
  v_all_signed BOOLEAN;
BEGIN
  -- Find the party by token
  SELECT * INTO v_party FROM public.signature_request_parties WHERE signing_token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;
  IF v_party.signed_at IS NOT NULL THEN
    RETURN json_build_object('error', 'already_signed', 'signed_at', v_party.signed_at);
  END IF;

  -- Check request is still pending
  IF NOT EXISTS (SELECT 1 FROM public.signature_requests WHERE id = v_party.request_id AND status = 'pending') THEN
    RETURN json_build_object('error', 'request_not_pending');
  END IF;

  -- Sign
  UPDATE public.signature_request_parties
  SET signed_at = now(), signature_data = p_signature_data, ip_address = p_ip_address
  WHERE id = v_party.id;

  -- Check if all parties have signed
  SELECT NOT EXISTS (
    SELECT 1 FROM public.signature_request_parties
    WHERE request_id = v_party.request_id AND signed_at IS NULL
  ) INTO v_all_signed;

  IF v_all_signed THEN
    UPDATE public.signature_requests SET status = 'completed' WHERE id = v_party.request_id;
  END IF;

  RETURN json_build_object('success', true, 'completed', v_all_signed);
END;
$$;
