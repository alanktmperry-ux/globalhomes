create table if not exists public.boost_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade not null,
  listing_id uuid references public.properties(id) on delete cascade not null,
  featured_listing_id uuid references public.featured_listings(id) on delete set null,
  tier text not null check (tier in ('halo_boost', 'super_booster')),
  stripe_customer_id text not null,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  status text not null check (status in ('pending', 'active', 'past_due', 'paused', 'cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_boost_subs_agent on public.boost_subscriptions(agent_id);
create index if not exists idx_boost_subs_listing on public.boost_subscriptions(listing_id);
create index if not exists idx_boost_subs_stripe on public.boost_subscriptions(stripe_subscription_id);

alter table public.boost_subscriptions enable row level security;

create policy "Agents see their own boost subscriptions"
  on public.boost_subscriptions for select
  using (auth.uid() in (select user_id from public.agents where id = boost_subscriptions.agent_id));

create policy "Agents manage their own boost subscriptions"
  on public.boost_subscriptions for all
  using (auth.uid() in (select user_id from public.agents where id = boost_subscriptions.agent_id));

create policy "Service role full access boost subs"
  on public.boost_subscriptions for all
  using (auth.jwt()->>'role' = 'service_role');

drop trigger if exists touch_boost_subs_updated_at on public.boost_subscriptions;
create trigger touch_boost_subs_updated_at
  before update on public.boost_subscriptions
  for each row execute function public.touch_updated_at();