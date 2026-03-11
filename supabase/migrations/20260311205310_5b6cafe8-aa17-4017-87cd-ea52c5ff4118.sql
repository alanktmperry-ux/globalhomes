
-- Extend app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'principal';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'property_manager';
