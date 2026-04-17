-- Add marketing_checklist JSON to properties for the marketing tab checklist state
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS marketing_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add per-lead agent notes and conversion tracking
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS agent_notes text,
  ADD COLUMN IF NOT EXISTS converted_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_converted_contact_id ON public.leads(converted_contact_id);