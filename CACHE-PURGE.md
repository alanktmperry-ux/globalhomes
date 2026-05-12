# Edge Cache Purge

The Cloudflare Worker for listhq.com.au serves the SPA HTML shell from
Cloudflare's edge cache with a 60s `max-age` + 600s `stale-while-revalidate`
window. Hashed `/assets/*` files are cached for 1 year (`immutable`).

In practice this means after Publish → Update:

- New JS/CSS chunks have hashed filenames → instantly visible (different URL).
- New HTML shell → propagates within ~60s, definitely within 10 min via SWR.

If you need a deploy to be visible *immediately*, call the purge endpoint.

## One-time setup

The purge endpoint (`supabase/functions/purge-edge-cache`) needs three secrets:

| Secret                 | Where to get it                                                          |
| ---------------------- | ------------------------------------------------------------------------ |
| `CACHE_PURGE_SECRET`   | Any long random string you choose (this is your shared bearer token).    |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → "Create Token" →        |
|                        | template "Edit zone DNS" or custom: permission `Zone → Cache Purge`,     |
|                        | scoped to the `listhq.com.au` zone only.                                 |
| `CLOUDFLARE_ZONE_ID`   | Cloudflare dashboard → `listhq.com.au` → Overview → "Zone ID" (sidebar). |

Add all three via project secrets (Lovable Cloud → Secrets) and the endpoint
becomes active. Until then it returns `503 not_configured`.

## Purge everything

```bash
curl -X POST \
  -H "Authorization: Bearer $CACHE_PURGE_SECRET" \
  https://<project-ref>.supabase.co/functions/v1/purge-edge-cache
```

## Purge specific URLs

```bash
curl -X POST \
  -H "Authorization: Bearer $CACHE_PURGE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://listhq.com.au/","https://listhq.com.au/about"]}' \
  https://<project-ref>.supabase.co/functions/v1/purge-edge-cache
```

## What the worker caches

| Path pattern                          | Cache-Control                                          |
| ------------------------------------- | ------------------------------------------------------ |
| `*.html` / SPA shell                  | `max-age=60, s-maxage=60, stale-while-revalidate=600`  |
| `/assets/*-[hash].{js,css,woff2,...}` | `max-age=31536000, immutable`                          |
| Images (`.jpg`, `.png`, `.webp`, …)   | `max-age=604800` (7 days)                              |
| `/api/*`, `/functions/*`              | `no-store` (never cached)                              |
| `/auth/*`, `/dashboard*`, `/admin*`   | `no-store` (never cached, `X-Cache-Status: BYPASS`)    |
| Any request with `Authorization`      | `no-store` (never cached)                              |

UTM / fbclid / gclid / mc_cid / mc_eid query params are stripped from the cache
key so they don't fragment the cache.
