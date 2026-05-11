create table if not exists public.featured_listings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.properties(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  tier text not null check (tier in ('super_booster', 'halo_boost')),
  suburb text not null,
  state text not null,
  region text not null,
  display_image_url text,
  display_address text not null,
  display_suburb text not null,
  display_state text not null,
  display_price text not null,
  display_beds int default 0,
  display_baths int default 0,
  display_cars int default 0,
  display_languages text[] default '{}',
  agent_name text,
  agent_initials text,
  agent_agency text,
  is_seeded boolean default false,
  boost_starts_at timestamptz default now(),
  boost_ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'expired', 'cancelled')),
  stripe_subscription_id text,
  display_priority int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.suburb_region_map (
  suburb text primary key,
  state text not null,
  region text not null
);

insert into public.suburb_region_map (suburb, state, region) values
  ('Doncaster', 'VIC', 'Melbourne East'),
  ('Doncaster East', 'VIC', 'Melbourne East'),
  ('Templestowe', 'VIC', 'Melbourne East'),
  ('Bulleen', 'VIC', 'Melbourne East'),
  ('Box Hill', 'VIC', 'Melbourne East'),
  ('Balwyn', 'VIC', 'Melbourne East'),
  ('Balwyn North', 'VIC', 'Melbourne East'),
  ('Camberwell', 'VIC', 'Melbourne East'),
  ('Auburn', 'NSW', 'Sydney West'),
  ('Strathfield', 'NSW', 'Sydney West'),
  ('Parramatta', 'NSW', 'Sydney West'),
  ('Westmead', 'NSW', 'Sydney West'),
  ('Cabramatta', 'NSW', 'Sydney South West'),
  ('Bankstown', 'NSW', 'Sydney South West'),
  ('Lakemba', 'NSW', 'Sydney South West'),
  ('Hurstville', 'NSW', 'Sydney South'),
  ('Glen Waverley', 'VIC', 'Melbourne East'),
  ('Brighton', 'VIC', 'Melbourne South'),
  ('St Kilda', 'VIC', 'Melbourne South'),
  ('Carlton', 'VIC', 'Melbourne Inner')
on conflict (suburb) do nothing;

insert into public.featured_listings (
  tier, suburb, state, region, display_image_url, display_address, display_suburb,
  display_state, display_price, display_beds, display_baths, display_cars,
  display_languages, agent_name, agent_initials, agent_agency, is_seeded, display_priority
) values
  ('halo_boost', 'Doncaster', 'VIC', 'Melbourne East',
   'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=85&w=900',
   '14 Manningham Rd', 'Doncaster', 'VIC', '$1,480,000', 4, 2, 2,
   ARRAY['🇨🇳','🇻🇳','🇰🇷'], 'Sarah Chen', 'SC', 'Buxton', true, 10),
  ('halo_boost', 'Doncaster East', 'VIC', 'Melbourne East',
   'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=900',
   '22 Tunstall Square', 'Doncaster East', 'VIC', '$1,895,000', 5, 3, 2,
   ARRAY['🇨🇳','🇮🇳'], 'David Marinakis', 'DM', 'Marshall White', true, 9),
  ('halo_boost', 'Templestowe', 'VIC', 'Melbourne East',
   'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=85&w=900',
   '8 Foote Street', 'Templestowe', 'VIC', '$2,250,000', 4, 3, 2,
   ARRAY['🇨🇳','🇰🇷'], 'Jellis Nguyen', 'JN', 'Jellis Craig', true, 8),
  ('halo_boost', 'Bulleen', 'VIC', 'Melbourne East',
   'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=85&w=900',
   '31 Templestowe Rd', 'Bulleen', 'VIC', '$1,295,000', 3, 2, 2,
   ARRAY['🇮🇹','🇬🇷'], 'Marco Rossi', 'MR', 'Fletchers', true, 7),
  ('halo_boost', 'Box Hill', 'VIC', 'Melbourne East',
   'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=85&w=900',
   '52 Whitehorse Rd', 'Box Hill', 'VIC', '$1,675,000', 4, 3, 2,
   ARRAY['🇨🇳','🇰🇷','🇻🇳'], 'Wei Lin', 'WL', 'Ray White', true, 6),
  ('halo_boost', 'Balwyn North', 'VIC', 'Melbourne East',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=85&w=900',
   '5 Belmore Rd', 'Balwyn North', 'VIC', '$3,250,000', 5, 4, 3,
   ARRAY['🇨🇳','🇮🇳'], 'Priya Joshi', 'PJ', 'Kay & Burton', true, 5);

create index if not exists idx_featured_listings_region_status_priority
  on public.featured_listings (region, status, display_priority desc);
create index if not exists idx_featured_listings_suburb_status
  on public.featured_listings (suburb, status);

alter table public.featured_listings enable row level security;
alter table public.suburb_region_map enable row level security;

create policy "Public can read active featured listings"
  on public.featured_listings for select
  using (status = 'active' and (boost_ends_at is null or boost_ends_at > now()));

create policy "Public can read suburb-region map"
  on public.suburb_region_map for select
  using (true);

create policy "Agents can manage their own featured listings"
  on public.featured_listings for all
  using (
    auth.uid() in (
      select user_id from public.agents where id = featured_listings.agent_id
    )
  );

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql set search_path = public;

drop trigger if exists touch_featured_listings_updated_at on public.featured_listings;
create trigger touch_featured_listings_updated_at
  before update on public.featured_listings
  for each row execute function public.touch_updated_at();