-- Remove strata_manager role from user_roles
DELETE FROM public.user_roles WHERE role::text = 'strata_manager';

-- Drop strata tables (CASCADE handles FK deps)
DROP TABLE IF EXISTS public.strata_listing_data CASCADE;
DROP TABLE IF EXISTS public.strata_schemes CASCADE;
DROP TABLE IF EXISTS public.strata_managers CASCADE;

-- Note: strata_fees_quarterly column on properties is intentionally kept.