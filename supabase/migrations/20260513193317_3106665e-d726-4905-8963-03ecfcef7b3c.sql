
ALTER TABLE public.rental_applications ADD COLUMN IF NOT EXISTS tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL;
ALTER TABLE public.tenancies ADD COLUMN IF NOT EXISTS source_application_id uuid REFERENCES public.rental_applications(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rental_applications_tenancy_id ON public.rental_applications(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_source_application_id ON public.tenancies(source_application_id);
