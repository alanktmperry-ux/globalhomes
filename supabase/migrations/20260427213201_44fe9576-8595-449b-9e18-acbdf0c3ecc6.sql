-- Add 'support' to the app_role enum (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';