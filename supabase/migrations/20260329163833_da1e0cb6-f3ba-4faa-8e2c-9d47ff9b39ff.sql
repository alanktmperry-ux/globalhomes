-- Fix trigger_buyer_concierge to use actual values instead of NULL GUC settings
CREATE OR REPLACE FUNCTION public.trigger_buyer_concierge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _key text;
BEGIN
  _url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  _key := coalesce(
    current_setting('app.settings.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );

  PERFORM net.http_post(
    url := _url || '/functions/v1/orchestrate-buyer-concierge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$function$;

-- Also fix trigger_compute_strata_health_score which has the same issue
CREATE OR REPLACE FUNCTION public.trigger_compute_strata_health_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _key text;
BEGIN
  _url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  _key := coalesce(
    current_setting('app.settings.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );

  PERFORM net.http_post(
    url := _url || '/functions/v1/compute-strata-health-score',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object('scheme_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;

-- Also fix notify_agent_on_lead and notify_agent_on_lead_event which use the same pattern
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prop_title text;
  _url text;
  _key text;
BEGIN
  SELECT title INTO prop_title FROM properties WHERE id = NEW.property_id;

  INSERT INTO notifications (agent_id, type, title, message, property_id, lead_id)
  VALUES (
    NEW.agent_id, 'lead',
    'New enquiry from ' || NEW.user_name,
    COALESCE(NEW.user_name, 'Someone') || ' enquired about ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id, NEW.id
  );

  BEGIN
    _url := coalesce(current_setting('app.settings.supabase_url', true), 'https://ngrkbohpmkzjonaofgbb.supabase.co');
    _key := coalesce(current_setting('app.settings.supabase_anon_key', true), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU');

    PERFORM net.http_post(
      url := _url || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := jsonb_build_object(
        'agent_id', NEW.agent_id, 'type', 'lead',
        'title', 'New enquiry from ' || NEW.user_name,
        'message', COALESCE(NEW.user_name, 'Someone') || ' enquired about ' || COALESCE(prop_title, 'your listing'),
        'property_id', NEW.property_id,
        'lead_name', NEW.user_name, 'lead_email', NEW.user_email,
        'lead_phone', NEW.user_phone, 'lead_message', NEW.message
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_agent_on_lead_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prop_title text;
  event_label text;
  _url text;
  _key text;
BEGIN
  SELECT title INTO prop_title FROM properties WHERE id = NEW.property_id;

  CASE NEW.event_type
    WHEN 'contact_click' THEN event_label := 'Contact click';
    WHEN 'phone_click' THEN event_label := 'Phone call';
    WHEN 'whatsapp_click' THEN event_label := 'WhatsApp message';
    WHEN 'email_click' THEN event_label := 'Email enquiry';
    ELSE event_label := NEW.event_type;
  END CASE;

  INSERT INTO notifications (agent_id, type, title, message, property_id)
  VALUES (
    NEW.agent_id, 'event',
    event_label || ' on ' || COALESCE(prop_title, 'your listing'),
    'A buyer interacted with ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id
  );

  BEGIN
    _url := coalesce(current_setting('app.settings.supabase_url', true), 'https://ngrkbohpmkzjonaofgbb.supabase.co');
    _key := coalesce(current_setting('app.settings.supabase_anon_key', true), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU');

    PERFORM net.http_post(
      url := _url || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := jsonb_build_object(
        'agent_id', NEW.agent_id, 'type', 'event',
        'title', event_label || ' on ' || COALESCE(prop_title, 'your listing'),
        'message', 'A buyer interacted with ' || COALESCE(prop_title, 'your listing'),
        'property_id', NEW.property_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;