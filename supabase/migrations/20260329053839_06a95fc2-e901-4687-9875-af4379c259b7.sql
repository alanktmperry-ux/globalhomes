-- Create secure marketplace view for consumer_profiles (PII masking)
CREATE OR REPLACE VIEW public.consumer_profiles_marketplace
WITH (security_invoker = true)
AS
SELECT
  cp.id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.lead_purchases lp
      JOIN public.agents a ON a.id = lp.agent_id
      WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
    ) THEN cp.name
    ELSE 'Verified Buyer'
  END AS name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.lead_purchases lp
      JOIN public.agents a ON a.id = lp.agent_id
      WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
    ) THEN cp.email
    ELSE NULL
  END AS email,
  cp.buying_situation,
  cp.budget_min,
  cp.budget_max,
  cp.preferred_suburbs,
  cp.preferred_type,
  cp.min_bedrooms,
  cp.lead_score,
  cp.is_purchasable,
  cp.created_at
FROM public.consumer_profiles cp
WHERE cp.is_purchasable = true
   OR cp.user_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.lead_purchases lp
     JOIN public.agents a ON a.id = lp.agent_id
     WHERE lp.lead_id = cp.id AND a.user_id = auth.uid()
   );