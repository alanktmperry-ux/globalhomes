
-- 1. Fix broker_leads_view: switch to security_invoker
ALTER VIEW public.broker_leads_view SET (security_invoker = on);

-- 2. Add search_path to all 26 functions missing it
ALTER FUNCTION public.assign_paddle_number() SET search_path = 'public';
ALTER FUNCTION public.auto_generate_property_slug() SET search_path = 'public';
ALTER FUNCTION public.compute_suburb_stats(text, text) SET search_path = 'public';
ALTER FUNCTION public.delete_user_cascade(uuid) SET search_path = 'public';
ALTER FUNCTION public.generate_agent_slug() SET search_path = 'public';
ALTER FUNCTION public.generate_property_slug(integer, text, text, text, uuid) SET search_path = 'public';
ALTER FUNCTION public.get_suburb_sitemap_entries() SET search_path = 'public';
ALTER FUNCTION public.log_property_price_change() SET search_path = 'public';
ALTER FUNCTION public.on_review_status_change() SET search_path = 'public';
ALTER FUNCTION public.refresh_agent_rating(uuid) SET search_path = 'public';
ALTER FUNCTION public.reset_boost_expiry_warned() SET search_path = 'public';
ALTER FUNCTION public.reset_reminder_flags_on_reschedule() SET search_path = 'public';
ALTER FUNCTION public.schools_within_km(double precision, double precision, double precision) SET search_path = 'public';
ALTER FUNCTION public.set_broker_lead_invoice_month() SET search_path = 'public';
ALTER FUNCTION public.update_crm_lead_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_eoi_updated_at() SET search_path = 'public';
ALTER FUNCTION public.validate_alert_type() SET search_path = 'public';
ALTER FUNCTION public.validate_crm_activity_type() SET search_path = 'public';
ALTER FUNCTION public.validate_crm_lead() SET search_path = 'public';
ALTER FUNCTION public.validate_eoi() SET search_path = 'public';
ALTER FUNCTION public.validate_listing_category() SET search_path = 'public';
ALTER FUNCTION public.validate_listing_mode() SET search_path = 'public';
ALTER FUNCTION public.validate_review_type() SET search_path = 'public';
ALTER FUNCTION public.validate_saved_search_frequency() SET search_path = 'public';
ALTER FUNCTION public.validate_suburb_market_stats_type() SET search_path = 'public';
ALTER FUNCTION public.validate_supplier_service_type() SET search_path = 'public';
