
create table if not exists public.broker_leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text,
  buyer_message     text,
  property_id       uuid references public.properties(id) on delete set null,
  property_address  text,
  property_price    text,
  broker_name       text not null default 'ListHQ Partner Broker',
  broker_email      text not null default 'broker@example.com.au',
  is_duplicate      boolean not null default false,
  is_qualified      boolean not null default true,
  invoice_month     text,
  invoiced_at       timestamptz,
  invoice_amount    numeric(10,2)
);

create or replace function public.set_broker_lead_invoice_month()
returns trigger language plpgsql as $$
begin
  NEW.invoice_month := to_char(NEW.created_at at time zone 'Australia/Sydney', 'YYYY-MM');
  return NEW;
end;
$$;

create trigger trg_broker_lead_invoice_month
  before insert on public.broker_leads
  for each row execute function public.set_broker_lead_invoice_month();

create index if not exists broker_leads_email_property_idx
  on public.broker_leads (buyer_email, property_id, created_at);

create index if not exists broker_leads_invoice_month_idx
  on public.broker_leads (invoice_month);

alter table public.broker_leads enable row level security;

create policy "Authenticated users can read broker_leads"
  on public.broker_leads for select
  to authenticated
  using (true);

create policy "No direct client insert"
  on public.broker_leads for insert
  to anon
  with check (false);
