-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view agent locations" ON public.agent_locations;

-- Create a safe public view excluding email and phone
CREATE OR REPLACE VIEW public.agent_locations_public_safe AS
SELECT id, agent_id, name, address, lat, lng, created_at, updated_at
FROM public.agent_locations;

-- Grant access to the view for public use
GRANT SELECT ON public.agent_locations_public_safe TO anon, authenticated;