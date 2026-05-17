create table if not exists public.listing_events (
  id            uuid        primary key default gen_random_uuid(),
  listing_id    uuid        not null references public.properties(id) on delete cascade,
  event_type    text        not null check (event_type in ('impression', 'click')),
  source        text        not null check (source in ('premier', 'featured')),
  slot_position int         not null check (slot_position between 1 and 5),
  suburb        text        not null,
  session_id    text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_listing_events_listing_id on public.listing_events(listing_id);
create index if not exists idx_listing_events_created_at on public.listing_events(created_at);

alter table public.listing_events enable row level security;

create policy "Anyone can insert listing events"
  on public.listing_events for insert
  to anon, authenticated
  with check (true);

create policy "Agents read own listing events"
  on public.listing_events for select
  to authenticated
  using (
    listing_id in (
      select p.id from public.properties p
      join public.agents a on a.id = p.agent_id
      where a.user_id = auth.uid()
    )
  );