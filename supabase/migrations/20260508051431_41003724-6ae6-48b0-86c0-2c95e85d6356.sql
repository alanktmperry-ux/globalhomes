
-- Trigger function: create inbox thread + initial inbound message when a lead is inserted
CREATE OR REPLACE FUNCTION public.create_inbox_thread_from_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_contact_id uuid;
  v_thread_id uuid;
  v_first_name text;
  v_last_name text;
  v_prop_address text;
  v_subject text;
  v_preview text;
  v_message_body text;
BEGIN
  -- Get agency for this agent
  SELECT agency_id INTO v_agency_id FROM agents WHERE id = NEW.agent_id;
  IF v_agency_id IS NULL THEN
    -- No agency, skip (legacy single agent setup)
    RETURN NEW;
  END IF;

  -- Split user_name into first/last
  v_first_name := split_part(COALESCE(NEW.user_name, ''), ' ', 1);
  v_last_name := NULLIF(trim(substring(COALESCE(NEW.user_name, '') FROM position(' ' IN COALESCE(NEW.user_name, '') || ' ') + 1)), '');

  -- Property address for subject
  SELECT COALESCE(address, title, 'a listing') INTO v_prop_address
  FROM properties WHERE id = NEW.property_id;

  -- Find existing contact by email + agency, else create
  IF NEW.user_email IS NOT NULL AND NEW.user_email <> '' THEN
    SELECT id INTO v_contact_id
    FROM contacts
    WHERE agency_id = v_agency_id AND lower(email) = lower(NEW.user_email)
    LIMIT 1;
  END IF;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (agency_id, created_by, contact_type, first_name, last_name, email, phone)
    VALUES (
      v_agency_id,
      NEW.agent_id,
      'buyer',
      COALESCE(NULLIF(v_first_name, ''), 'Buyer'),
      v_last_name,
      NEW.user_email,
      NEW.user_phone
    )
    RETURNING id INTO v_contact_id;
  END IF;

  -- Build subject and preview
  v_subject := 'Enquiry: ' || COALESCE(v_prop_address, 'a listing');
  v_message_body := COALESCE(NULLIF(NEW.message, ''), 'Hi, I am interested in this property. Please get in touch.');
  v_preview := left(v_message_body, 140);

  -- Create thread
  INSERT INTO inbox_threads (
    agency_id, contact_id, lead_id, subject,
    last_message_at, last_message_preview, is_unread,
    assigned_agent_id, status
  )
  VALUES (
    v_agency_id, v_contact_id, NEW.id, v_subject,
    NEW.created_at, v_preview, true,
    NEW.agent_id, 'open'
  )
  RETURNING id INTO v_thread_id;

  -- Insert initial inbound message
  INSERT INTO inbox_messages (
    thread_id, channel, direction, sender_type, sender_id, body, sent_at
  )
  VALUES (
    v_thread_id, 'email', 'inbound', 'contact', NEW.user_id,
    v_message_body, NEW.created_at
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block lead creation if inbox thread fails
  RAISE WARNING 'create_inbox_thread_from_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if any, then create AFTER INSERT trigger
DROP TRIGGER IF EXISTS on_lead_create_inbox_thread ON public.leads;
CREATE TRIGGER on_lead_create_inbox_thread
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.create_inbox_thread_from_lead();
