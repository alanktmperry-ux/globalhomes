CREATE OR REPLACE FUNCTION public.set_owner_portal_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_portal_token IS NULL OR NEW.owner_portal_token = '' THEN
    NEW.owner_portal_token := encode(extensions.gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;