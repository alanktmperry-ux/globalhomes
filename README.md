# ListHQ

Australia's multilingual real estate operating system.

ListHQ replaces 5+ tools agents currently use — listings portal, CRM, property management, trust accounting, and buyer lead gen — in one platform across 20 languages.

## Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Framer Motion + TanStack Query
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Edge Functions)
- **Payments**: Stripe
- **Email**: Resend
- **i18n**: 20 languages
- **Deployment**: Lovable + Cloudflare Workers (SSR)

## Environment Variables
Copy `.env.example` and fill in required values before running locally.

## Local Development
```bash
npm install
npm run dev
```

## Architecture
- `src/features/` — domain-grouped feature modules (agents, halo, trust, pm, contacts)
- `src/pages/` — route-level page components
- `src/shared/` — shared components, hooks, utilities
- `supabase/functions/` — Deno edge functions
- `supabase/migrations/` — 400+ database migrations
