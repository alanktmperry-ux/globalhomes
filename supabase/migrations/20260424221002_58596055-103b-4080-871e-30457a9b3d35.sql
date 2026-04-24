
-- Add FKs to crm_leads with ON DELETE SET NULL
-- agent_id needs to become nullable since SET NULL requires it
ALTER TABLE public.crm_leads ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;

ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_source_property_id_fkey
  FOREIGN KEY (source_property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
