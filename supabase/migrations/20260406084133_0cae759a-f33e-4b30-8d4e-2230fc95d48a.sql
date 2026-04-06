
-- Step 1: Create the brokers table
create table if not exists public.brokers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  email           text not null unique,
  phone           text,
  company         text,
  acl_number      text not null,
  photo_url       text,
  languages       text[] not null default array['English'],
  tagline         text,
  calendar_url    text,
  is_active       boolean not null default true,
  is_founding_partner boolean not null default false,
  monthly_cap_aud numeric(10,2) default 500.00,
  cap_expires_at  timestamptz,
  auth_user_id    uuid references auth.users(id) on delete set null,
  lead_fee_aud    numeric(10,2) not null default 75.00
);

create unique index if not exists brokers_email_idx on public.brokers (email);
create unique index if not exists brokers_auth_user_idx on public.brokers (auth_user_id)
  where auth_user_id is not null;

-- Step 2: Migrate broker_leads to use broker_id foreign key
alter table public.broker_leads
  add column if not exists broker_id uuid references public.brokers(id) on delete set null;

create index if not exists broker_leads_broker_id_idx
  on public.broker_leads (broker_id);

-- Step 3: RLS on brokers table
alter table public.brokers enable row level security;

create policy "Broker can read own record"
  on public.brokers for select
  to authenticated
  using (auth_user_id = auth.uid());

-- Step 4: Update RLS on broker_leads
drop policy if exists "Authenticated users can read broker_leads" on public.broker_leads;

create policy "Broker can read own leads"
  on public.broker_leads for select
  to authenticated
  using (
    broker_id in (
      select id from public.brokers
      where auth_user_id = auth.uid()
    )
  );

-- Step 5: Helper view for broker dashboard
create or replace view public.broker_leads_view as
  select
    bl.id,
    bl.created_at,
    bl.buyer_name,
    bl.buyer_email,
    bl.buyer_phone,
    bl.buyer_message,
    bl.property_address,
    bl.property_price,
    bl.is_duplicate,
    bl.is_qualified,
    bl.invoice_month,
    bl.invoiced_at,
    bl.broker_id,
    b.lead_fee_aud,
    (b.cap_expires_at is null or bl.created_at <= b.cap_expires_at) as within_cap_window
  from public.broker_leads bl
  join public.brokers b on b.id = bl.broker_id;

-- Step 6: Function to link broker auth user on login
-- Instead of a trigger on auth.users (reserved schema),
-- this is a security definer function called from the portal.
create or replace function public.link_broker_auth_user(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.brokers
  set auth_user_id = p_user_id
  where email = lower(p_email)
    and auth_user_id is null;
end;
$$;
