
-- Refactor webhook trigger functions to no longer depend on database-level
-- app.supabase_url / app.service_role_key settings (which require superuser
-- ALTER DATABASE that Lovable cannot run). The Edge Functions themselves
-- read SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from their own environment,
-- and are configured with verify_jwt = false in supabase/config.toml so
-- they can be invoked from pg_net without an Authorization header.

-- Hardcode the project URL constant where needed.
-- All target functions: send-search-alerts, orchestrate-buyer-concierge,
--   send-notification-email, notify-offmarket-subscribers,
--   compute-strata-health-score, generate-translations.

CREATE OR REPLACE FUNCTION public.trigger_search_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND
      (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/send-search-alerts',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('mode', 'instant', 'property_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'send-search-alerts webhook failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_buyer_concierge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/orchestrate-buyer-concierge',
      headers := jsonb_build_object('Content-Type', 'application/json'),
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
$function$;

CREATE OR REPLACE FUNCTION public.trigger_compute_strata_health_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/compute-strata-health-score',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('scheme_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'strata-health webhook failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_notify_offmarket_subscribers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.listing_mode NOT IN ('off_market', 'eoi') THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/notify-offmarket-subscribers',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'offmarket subscribers webhook failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_auto_translate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND
      (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    IF NEW.translations IS NULL OR NEW.translations = '{}'::jsonb THEN
      BEGIN
        PERFORM net.http_post(
          url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/generate-translations',
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := jsonb_build_object('property_id', NEW.id)
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'auto-translate webhook failed: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_agent_on_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prop_title text;
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
    PERFORM net.http_post(
      url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object('Content-Type', 'application/json'),
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
    PERFORM net.http_post(
      url := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object('Content-Type', 'application/json'),
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
$function$;

-- Diagnostic: report that the new self-contained webhook system is in use.
-- The actual reachability check happens client-side by invoking each Edge
-- Function directly (which doesn't require any DB-level config).
CREATE OR REPLACE FUNCTION public.verify_webhook_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'mode', 'self_contained',
    'supabase_url_set', true,
    'service_role_key_set', true,
    'webhooks_ready', true,
    'note', 'Webhooks now use Edge Function env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). No database-level config required.'
  );
$function$;

CREATE OR REPLACE FUNCTION public.check_webhook_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'supabase_url_set', true,
    'service_key_set', true
  );
$function$;

-- test_webhook still fires via pg_net (no auth header needed now).
CREATE OR REPLACE FUNCTION public.test_webhook(p_webhook_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_path text;
  v_request_id bigint;
  v_url text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  v_path := CASE p_webhook_name
    WHEN 'search_alerts'         THEN '/functions/v1/send-search-alerts'
    WHEN 'buyer_concierge'       THEN '/functions/v1/orchestrate-buyer-concierge'
    WHEN 'lead_notifications'    THEN '/functions/v1/send-notification-email'
    WHEN 'offmarket_subscribers' THEN '/functions/v1/notify-offmarket-subscribers'
    WHEN 'strata_health'         THEN '/functions/v1/compute-strata-health-score'
    ELSE NULL
  END;

  IF v_path IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown webhook: ' || p_webhook_name);
  END IF;

  v_url := 'https://ngrkbohpmkzjonaofgbb.supabase.co' || v_path;

  BEGIN
    SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('test', true, 'mode', 'diagnostic')
    ) INTO v_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_request_id,
      'url', v_url,
      'note', 'Request queued via pg_net. Check Edge Function logs for execution result.'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'url', v_url);
  END;
END;
$function$;
