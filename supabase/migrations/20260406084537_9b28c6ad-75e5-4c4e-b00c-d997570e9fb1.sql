
-- Allow public (anon) read of active brokers for the property detail broker card
create policy "Public can read active brokers"
  on public.brokers for select
  to anon
  using (is_active = true);
