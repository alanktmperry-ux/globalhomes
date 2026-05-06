-- Remove overly permissive Realtime policy and public owner_portal_preferences read

DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;

DROP POLICY IF EXISTS "Public can read owner portal prefs" ON public.owner_portal_preferences;
