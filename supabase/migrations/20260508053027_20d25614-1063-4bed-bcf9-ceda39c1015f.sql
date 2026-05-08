CREATE OR REPLACE FUNCTION public.create_notification_from_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address text;
BEGIN
  IF NEW.agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT address INTO v_address FROM public.properties WHERE id = NEW.property_id;

  INSERT INTO public.notifications (agent_id, type, title, message, property_id, lead_id, is_read)
  VALUES (
    NEW.agent_id,
    'new_enquiry',
    COALESCE(NEW.user_name, 'A buyer') || ' enquired',
    COALESCE(v_address, 'New property enquiry'),
    NEW.property_id,
    NEW.id,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lead_create_notification ON public.leads;

CREATE TRIGGER on_lead_create_notification
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_from_lead();