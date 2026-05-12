# Cloudflare Worker Activation Runbook

The Worker code at `cloudflare-worker.js` is **code complete but parked**.
The repo is wired so activation is a ~1 hour switch — no code changes needed.

## Status today

- `cloudflare-worker.js` — edge cache + SWR + brotli + bot SEO injection, ready
- `wrangler.toml` — points wrangler at the worker, account/route left blank
- `.github/workflows/deploy-cloudflare-worker.yml` — auto-deploys on push to
  `main` **if** Cloudflare secrets exist. Skips cleanly otherwise.
- `WORKER_VERSION = '2026-05-12-edge-cache-v2'` — stamps every response with
  `X-Worker-Version` so a single `curl -I` confirms a live deploy.

Until activation, `listhq.com.au` is served directly from Lovable's hosting
and `X-Cache-Status` / `X-Worker-Version` headers will not appear.

## Activation steps (in this order)

### 1. Add GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret                  | Where to get it                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | CF dash → My Profile → API Tokens → Create Token. Template: "Edit Cloudflare Workers".   |
| `CLOUDFLARE_ACCOUNT_ID` | CF dash → Workers & Pages → right sidebar "Account ID".                                  |

### 2. Set runtime secrets on the worker (one-time, via wrangler locally)

```bash
npm i -g wrangler
wrangler login
wrangler secret put SUPABASE_URL                # https://ngrkbohpmkzjonaofgbb.supabase.co
wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # from Lovable Cloud → Backend → API
wrangler secret put APP_ORIGIN                  # https://listhq.lovable.app
```

### 3. First deploy

Either push any commit touching `cloudflare-worker.js` (GHA will run) or:

```bash
wrangler deploy
```

### 4. Wire DNS + route

In the Cloudflare dashboard for `listhq.com.au`:

1. **DNS** → flip the `listhq.com.au` and `www.listhq.com.au` records from
   grey-cloud (DNS only) to orange-cloud (proxied).
2. **Workers & Pages** → `listhq-edge` → **Triggers** → **Add route**:
   - `listhq.com.au/*` → `listhq-edge`
   - `www.listhq.com.au/*` → `listhq-edge`

### 5. Verify

```bash
curl -sI https://listhq.com.au/ | grep -Ei 'x-worker-version|x-cache-status|content-encoding'
```

Expected on first request:

```
x-worker-version: 2026-05-12-edge-cache-v2
x-cache-status: MISS
content-encoding: br
```

Run again within 60s → `x-cache-status: HIT` and TTFB < 200ms.

## Rollback plan

If anything breaks behind the Cloudflare proxy (Lovable publish flow, auth
callbacks, OAuth redirects, Stripe webhooks hitting the apex):

1. **Fastest rollback (30s):** Cloudflare dash → DNS → flip both records
   back to grey-cloud. Traffic instantly bypasses the worker and goes
   straight to Lovable hosting again. Worker code stays deployed but inert.
2. **Code rollback:** delete the worker route in Cloudflare dash → Workers
   & Pages → `listhq-edge` → Triggers. Worker still exists but receives
   no traffic.
3. **Nuclear:** `wrangler delete` to remove the worker entirely.

The Lovable preview/published URLs (`*.lovable.app`) are never proxied
through this worker, so the Lovable editor and Publish flow keep working
regardless of the Cloudflare state.

## Things that must NOT be cached (sanity check)

`isCacheableRequest` in `cloudflare-worker.js` already excludes:
- `/auth/*`, `/api/*`, `/dashboard/*`, `/admin/*`, `/broker/*`
- any request carrying `Cookie: sb-*` (authenticated Supabase session)
- non-GET methods

If you add new authenticated routes, update the bypass predicate before
activation.

## Cache purge after a deploy

Lovable's `Publish → Update` already invalidates hashed `/assets/*.js`
filenames. To force an immediate HTML refresh, see `CACHE-PURGE.md`.
