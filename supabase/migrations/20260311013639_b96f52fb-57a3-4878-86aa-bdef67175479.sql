
-- Add 'principal' to the agency_member_role enum
ALTER TYPE public.agency_member_role ADD VALUE IF NOT EXISTS 'principal';

-- Add access_level column to agency_members (simple: 'read' or 'full')
ALTER TABLE public.agency_members 
ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'full';
