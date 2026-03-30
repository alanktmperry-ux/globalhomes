CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

DROP TRIGGER IF EXISTS on_voice_search_insert ON public.voice_searches;

CREATE TRIGGER on_voice_search_insert
AFTER INSERT ON public.voice_searches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_buyer_concierge();