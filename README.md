# PMSA CBS

Production-oriented internal college savings bank built with Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage, Tailwind CSS v4, custom CSS components, and PWA support.

## Setup

1. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` for server-only manager customer creation
   - `NEXT_PUBLIC_SITE_URL`
2. Put these assets in `public/`:
   - `cbslogo.png`
   - `cbslogovideo.mp4`
3. Run the migration in `supabase/migrations/001_initial_pmsa_cbs.sql`.
4. Manually create Supabase Auth users:
   - Manager: `cbsmasapmsa@gmail.com` / `cbsmasa786`
   - Head: `administrator@pmsa.com` / `pmsa-officer`
5. Create an active manager period in Supabase, or use the handover RPC after the head profile exists.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

Money-changing operations are routed through protected Postgres RPC functions. The frontend never updates customer balances directly, and transactions are immutable by database trigger.

