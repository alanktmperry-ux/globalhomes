
REVOKE SELECT (support_pin, stripe_customer_id, stripe_subscription_id, lead_source, lifecycle_stage, aml_ctf_acknowledged, last_compliance_check_at) ON public.agents FROM anon, authenticated;
