-- email_log table for deduplication of outbound emails
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_id uuid,
  template text NOT NULL,
  subject text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_dedup
  ON public.email_log (recipient_email, template);

CREATE INDEX IF NOT EXISTS idx_email_log_sent_at
  ON public.email_log (sent_at DESC);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Admins only — no user-facing policies. Service role bypasses RLS.
CREATE POLICY "Admins can view email log"
  ON public.email_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to invoke send-search-alerts edge function when listings go live
CREATE OR REPLACE FUNCTION public.trigger_search_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire when a listing becomes active (insert active, or update flipping to active)
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND
      (OLD.is_active = false OR OLD.is_active IS NULL)) THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-search-alerts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := jsonb_build_object('mode', 'instant', 'property_id', NEW.id)
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_published ON public.properties;
CREATE TRIGGER on_listing_published
  AFTER INSERT OR UPDATE OF is_active
  ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_search_alerts();