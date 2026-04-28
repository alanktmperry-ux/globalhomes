CREATE TABLE public.tenancy_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('primary_tenant','co_tenant','emergency_contact','guarantor')),
  name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  id_verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenancy_contacts_tenancy_id ON public.tenancy_contacts(tenancy_id);

ALTER TABLE public.tenancy_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their tenancy contacts"
ON public.tenancy_contacts FOR SELECT
USING (public.is_tenancy_agent(tenancy_id, auth.uid()));

CREATE POLICY "Agents can insert tenancy contacts"
ON public.tenancy_contacts FOR INSERT
WITH CHECK (public.is_tenancy_agent(tenancy_id, auth.uid()));

CREATE POLICY "Agents can update their tenancy contacts"
ON public.tenancy_contacts FOR UPDATE
USING (public.is_tenancy_agent(tenancy_id, auth.uid()));

CREATE POLICY "Agents can delete their tenancy contacts"
ON public.tenancy_contacts FOR DELETE
USING (public.is_tenancy_agent(tenancy_id, auth.uid()));