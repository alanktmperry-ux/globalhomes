-- Fix: guard all net.http_post calls against null URL / missing config.
-- Uses both 'app.supabase_url' and 'app.settings.supabase_url' GUC names with
-- a hardcoded project-URL fallback so triggers never crash listing publishing.

-- 1) trigger_search_alerts (the one currently breaking publish)
CREATE OR REPLACE FUNCTION public.trigger_search_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key text := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), '')
  );
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Skipping search-alerts webhook — app.supabase_url or service key not configured';
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND
      (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-search-alerts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object('mode', 'instant', 'property_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'send-search-alerts webhook failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) trigger_buyer_concierge
CREATE OR REPLACE FUNCTION public.trigger_buyer_concierge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url text := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key text := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), ''),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Skipping buyer-concierge webhook — config missing';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/orchestrate-buyer-concierge',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'voice_search_id', NEW.id,
        'transcript', NEW.transcript,
        'user_id', NEW.user_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'buyer-concierge webhook failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3) trigger_compute_strata_health_score
CREATE OR REPLACE FUNCTION public.trigger_compute_strata_health_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url text := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key text := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), ''),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );
BEGIN
  IF v_supabase_url IS NULL OR v_supabase_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Skipping strata-health webhook — config missing';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/compute-strata-health-score',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('scheme_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'strata-health webhook failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 4) notify_agent_on_lead
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop_title text;
  v_supabase_url text := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key text := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), ''),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );
BEGIN
  SELECT title INTO prop_title FROM properties WHERE id = NEW.property_id;

  INSERT INTO notifications (agent_id, type, title, message, property_id, lead_id)
  VALUES (
    NEW.agent_id, 'lead',
    'New enquiry from ' || NEW.user_name,
    COALESCE(NEW.user_name, 'Someone') || ' enquired about ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id, NEW.id
  );

  IF v_supabase_url IS NULL OR v_supabase_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Skipping lead email webhook — config missing';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
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
    RAISE WARNING 'lead email webhook failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 5) notify_agent_on_lead_event
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop_title text;
  event_label text;
  v_supabase_url text := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key text := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), ''),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );
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

  IF v_supabase_url IS NULL OR v_supabase_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Skipping event email webhook — config missing';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'agent_id', NEW.agent_id, 'type', 'event',
        'title', event_label || ' on ' || COALESCE(prop_title, 'your listing'),
        'message', 'A buyer interacted with ' || COALESCE(prop_title, 'your listing'),
        'property_id', NEW.property_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'event email webhook failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 6) trigger_notify_offmarket_subscribers
CREATE OR REPLACE FUNCTION public.trigger_notify_offmarket_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url text := coalesce(
    nullif(current_setting('app.supabase_url', true), ''),
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ngrkbohpmkzjonaofgbb.supabase.co'
  );
  v_service_key text := coalesce(
    nullif(current_setting('app.service_role_key', true), ''),
    nullif(current_setting('app.settings.service_role_key', true), ''),
    nullif(current_setting('app.settings.supabase_anon_key', true), ''),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncmtib2hwbWt6am9uYW9mZ2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDg5ODMsImV4cCI6MjA4ODQ4NDk4M30.UO9tGua8mfz1ava1zg75lzzOflK9z6z0yh7IwbWqsCU'
  );
BEGIN
  IF NEW.listing_mode NOT IN ('off_market', 'eoi') THEN
    RETURN NEW;
  END IF;

  IF v_supabase_url IS NULL OR v_supabase_url = '' OR v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'Skipping offmarket subscribers webhook — config missing';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-offmarket-subscribers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'offmarket subscribers webhook failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 7) Diagnostic helper
CREATE OR REPLACE FUNCTION public.check_webhook_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'supabase_url_set',
      (nullif(current_setting('app.supabase_url', true), '') IS NOT NULL)
      OR (nullif(current_setting('app.settings.supabase_url', true), '') IS NOT NULL),
    'service_key_set',
      (nullif(current_setting('app.service_role_key', true), '') IS NOT NULL)
      OR (nullif(current_setting('app.settings.service_role_key', true), '') IS NOT NULL)
      OR (nullif(current_setting('app.settings.supabase_anon_key', true), '') IS NOT NULL)
  );
$$;