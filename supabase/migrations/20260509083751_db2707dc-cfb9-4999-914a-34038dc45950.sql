create table if not exists public.unsubscribes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  category text not null check (category in ('welcome','tips','transactional')),
  unsubscribed_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists idx_unsubscribes_user_category on public.unsubscribes(user_id, category);
create index if not exists idx_unsubscribes_email on public.unsubscribes(email);

alter table public.unsubscribes enable row level security;

drop policy if exists "users see own unsubscribes" on public.unsubscribes;
create policy "users see own unsubscribes"
  on public.unsubscribes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "service role manages unsubscribes" on public.unsubscribes;
create policy "service role manages unsubscribes"
  on public.unsubscribes for all
  to service_role
  using (true) with check (true);