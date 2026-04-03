
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'lead',
  title text NOT NULL,
  message text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Agents can view own notifications
CREATE POLICY "Agents can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Agents can update own notifications (mark as read)
CREATE POLICY "Agents can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: auto-create notification when a new lead is submitted
CREATE OR REPLACE FUNCTION public.notify_agent_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop_title text;
BEGIN
  SELECT title INTO prop_title FROM properties WHERE id = NEW.property_id;
  
  INSERT INTO notifications (agent_id, type, title, message, property_id, lead_id)
  VALUES (
    NEW.agent_id,
    'lead',
    'New enquiry from ' || NEW.user_name,
    COALESCE(NEW.user_name, 'Someone') || ' enquired about ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_agent_on_lead();

-- Trigger: auto-create notification on lead_events (contact clicks, etc.)
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
  
  INSERT INTO notifications (agent_id, type, title, message, property_id)
  VALUES (
    NEW.agent_id,
    'event',
    event_label || ' on ' || COALESCE(prop_title, 'your listing'),
    'A buyer interacted with ' || COALESCE(prop_title, 'your listing'),
    NEW.property_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_event_created
AFTER INSERT ON public.lead_events
FOR EACH ROW
EXECUTE FUNCTION public.notify_agent_on_lead_event();
