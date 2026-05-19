-- Fix: 8 Security Definer Views → switch to security_invoker
ALTER VIEW public.agent_locations_public_safe SET (security_invoker = true);
ALTER VIEW public.agents_public SET (security_invoker = true);
ALTER VIEW public.agents_public_safe SET (security_invoker = true);
ALTER VIEW public.broker_leads_view SET (security_invoker = true);
ALTER VIEW public.brokers_public_safe SET (security_invoker = true);
ALTER VIEW public.conversation_participant_locales SET (security_invoker = true);
ALTER VIEW public.listings_translation_summary SET (security_invoker = true);
ALTER VIEW public.rate_limit_dashboard SET (security_invoker = true);

-- Fix: halo_embeddings has RLS enabled but no policy → add explicit admin-only read
-- (Edge functions use service role which bypasses RLS; clients should never read this directly)
CREATE POLICY "Admins can read halo embeddings"
ON public.halo_embeddings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));