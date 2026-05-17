# Supabase Edge Function Secrets

Set these in the Supabase dashboard → Project Settings → Edge Functions → Secrets.
Do NOT put these in .env files — they are server-side only.

| Secret | Description |
|---|---|
| `APP_URL` | Public app URL — `https://listhq.com.au` |
| `SITE_URL` | Same as APP_URL (legacy alias) |
| `ADMIN_EMAIL` | Admin notification email address |
| `RESEND_API_KEY` | Resend transactional email API key |
| `EMAIL_FROM` | From address for transactional emails |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_…) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | Subscription-specific webhook secret |
| `STRIPE_CREDIT_WEBHOOK_SECRET` | Credit purchase webhook secret |
| `STRIPE_LISTING_BOOST_WEBHOOK_SECRET` | Listing boost webhook secret |
| `GOOGLE_MAPS_API_KEY` | Server-side Maps key (unrestricted) |
| `GOOGLE_TRANSLATE_API_KEY` | Cloud Translation API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (E.164 format) |
| `UNSUBSCRIBE_SECRET` | HMAC secret for email unsubscribe tokens |
| `CRON_SECRET` | Secret for pg_cron → edge function calls |
| `INTERNAL_SECRET` | Internal service-to-service auth secret |
| `HEALTH_CHECK_SECRET` | Health check endpoint secret |
| `CACHE_PURGE_SECRET` | Cloudflare cache purge secret |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID |
| `SEED_SECRET` | Seed script auth secret (dev only) |
| `SEED_AGENT_ID` | Agent ID for seed data (dev only) |
| `LOVABLE_API_KEY` | Lovable deployment API key |
| `LOVABLE_SEND_URL` | Lovable email send URL |
