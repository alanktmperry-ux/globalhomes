
-- Re-attach triggers that were dropped
DROP TRIGGER IF EXISTS on_lead_created ON public.leads;
CREATE TRIGGER on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_agent_on_lead();

DROP TRIGGER IF EXISTS on_lead_event_created ON public.lead_events;
CREATE TRIGGER on_lead_event_created
  AFTER INSERT ON public.lead_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_agent_on_lead_event();
