
-- Update the lead notification trigger to also send email
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop_title text;
  agent_email text;
BEGIN
  SELECT title INTO prop_title FROM properties WHERE id = NEW.property_id;
  
  -- Insert in-app notification
  INSERT INTO notifications (agent_id, type, title, message, property_id, lead_id)
  VALUES (
    NEW.agent_id,
    'lead',
    'New enquiry from ' || NEW.user_name,
    COALESCE(NEW.user_name, 'Someone') || ' enquired about ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id,
    NEW.id
  );

  -- Send email notification via edge function
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'agent_id', NEW.agent_id,
      'type', 'lead',
      'title', 'New enquiry from ' || NEW.user_name,
      'message', COALESCE(NEW.user_name, 'Someone') || ' enquired about ' || COALESCE(prop_title, 'your listing'),
      'property_id', NEW.property_id,
      'lead_name', NEW.user_name,
      'lead_email', NEW.user_email,
      'lead_phone', NEW.user_phone,
      'lead_message', NEW.message
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the lead insert if email fails
  RAISE WARNING 'Email notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Update the lead event notification trigger to also send email
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop_title text;
  event_label text;
BEGIN
  SELECT title INTO prop_title FROM properties WHERE id = NEW.property_id;
  
  CASE NEW.event_type
    WHEN 'contact_click' THEN event_label := 'Contact click';
    WHEN 'phone_click' THEN event_label := 'Phone call';
    WHEN 'whatsapp_click' THEN event_label := 'WhatsApp message';
    WHEN 'email_click' THEN event_label := 'Email enquiry';
    ELSE event_label := NEW.event_type;
  END CASE;
  
  -- Insert in-app notification
  INSERT INTO notifications (agent_id, type, title, message, property_id)
  VALUES (
    NEW.agent_id,
    'event',
    event_label || ' on ' || COALESCE(prop_title, 'your listing'),
    'A buyer interacted with ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id
  );

  -- Send email notification via edge function
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'agent_id', NEW.agent_id,
      'type', 'event',
      'title', event_label || ' on ' || COALESCE(prop_title, 'your listing'),
      'message', 'A buyer interacted with ' || COALESCE(prop_title, 'your listing'),
      'property_id', NEW.property_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
