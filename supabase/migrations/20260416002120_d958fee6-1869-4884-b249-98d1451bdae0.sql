create table if not exists public.property_inspections (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid references public.tenancies(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  agent_id uuid references public.agents(id) on delete cascade not null,
  inspection_type text not null check (inspection_type in ('entry','routine','exit')),
  scheduled_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  notice_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.property_inspections enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'property_inspections' AND policyname = 'Agents manage own inspections'
  ) THEN
    CREATE POLICY "Agents manage own inspections"
      ON public.property_inspections
      FOR ALL USING (agent_id = (
        SELECT id FROM public.agents WHERE user_id = auth.uid() LIMIT 1
      ));
  END IF;
END $$;

create index if not exists property_inspections_tenancy_id_idx on public.property_inspections(tenancy_id);
create index if not exists property_inspections_scheduled_date_idx on public.property_inspections(scheduled_date);