-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any existing jobs with these names before recreating (safe re-run)
select cron.unschedule('drip-processor')             where exists (select 1 from cron.job where jobname = 'drip-processor');
select cron.unschedule('send-search-alerts')          where exists (select 1 from cron.job where jobname = 'send-search-alerts');
select cron.unschedule('halo-expiry-reminders')       where exists (select 1 from cron.job where jobname = 'halo-expiry-reminders');
select cron.unschedule('match-saved-searches')        where exists (select 1 from cron.job where jobname = 'match-saved-searches');
select cron.unschedule('buyer-match-weekly-digest')   where exists (select 1 from cron.job where jobname = 'buyer-match-weekly-digest');

-- Job 1: drip-processor — every hour at minute 0
select cron.schedule(
  'drip-processor',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/drip-processor',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'listhq-cron-8f3k2m9x4p7w'
    ),
    body    := '{}'::jsonb
  ) as request_id
  $$
);

-- Job 2: send-search-alerts — daily at 8am AEST (22:00 UTC)
select cron.schedule(
  'send-search-alerts',
  '0 22 * * *',
  $$
  select net.http_post(
    url     := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/send-search-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'listhq-cron-8f3k2m9x4p7w'
    ),
    body    := '{}'::jsonb
  ) as request_id
  $$
);

-- Job 3: halo-expiry-reminders — daily at 9am AEST (23:00 UTC)
select cron.schedule(
  'halo-expiry-reminders',
  '0 23 * * *',
  $$
  select net.http_post(
    url     := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/halo-expiry-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'listhq-cron-8f3k2m9x4p7w'
    ),
    body    := '{}'::jsonb
  ) as request_id
  $$
);

-- Job 4: match-saved-searches — daily at 9am AEST (23:00 UTC)
select cron.schedule(
  'match-saved-searches',
  '0 23 * * *',
  $$
  select net.http_post(
    url     := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/match-saved-searches',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'listhq-cron-8f3k2m9x4p7w'
    ),
    body    := '{}'::jsonb
  ) as request_id
  $$
);

-- Job 5: buyer-match-weekly-digest — Monday 9am AEST (Sunday 23:00 UTC)
select cron.schedule(
  'buyer-match-weekly-digest',
  '0 23 * * 0',
  $$
  select net.http_post(
    url     := 'https://ngrkbohpmkzjonaofgbb.supabase.co/functions/v1/buyer-match-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'listhq-cron-8f3k2m9x4p7w'
    ),
    body    := '{}'::jsonb
  ) as request_id
  $$
);