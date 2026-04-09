-- Revoke SELECT on sensitive columns from anon and authenticated roles
REVOKE SELECT (support_pin, stripe_customer_id, stripe_subscription_id) ON public.agents FROM anon, authenticated;
