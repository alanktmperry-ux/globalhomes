-- 1. Revoke SELECT on sensitive agent columns from anon
REVOKE SELECT (
  support_pin,
  stripe_customer_id,
  stripe_subscription_id,
  payment_failed_at,
  admin_grace_until,
  aml_ctf_acknowledged,
  lifecycle_stage,
  cpd_hours_completed,
  cpd_hours_required,
  last_compliance_check_at,
  licence_expiry_date,
  lead_source
) ON public.agents FROM anon;

-- 2. Create a safe public view for brokers (no email, phone, billing fields)
CREATE OR REPLACE VIEW public.brokers_public_safe AS
SELECT
  id,
  name,
  company,
  photo_url,
  languages,
  tagline,
  acl_number,
  is_founding_partner,
  is_active,
  calendar_url
FROM public.brokers
WHERE is_active = true;

GRANT SELECT ON public.brokers_public_safe TO anon, authenticated;

-- 3. Drop the overly permissive anon SELECT policy on brokers
DROP POLICY IF EXISTS "Public can read active brokers" ON public.brokers;