CREATE OR REPLACE TRIGGER on_voice_search_insert
  AFTER INSERT ON public.voice_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_buyer_concierge();