# Swastha Learning Portal

Starter frontend for the Swastha Learning Portal.

## Technology
- Next.js
- TypeScript
- Supabase (connection placeholder included)

## Run locally
1. Install Node.js.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and anon/publishable key.
5. Run `npm run dev`.

## Important
This starter currently contains the public landing page only. Parent, teacher and administrator authentication, dashboards, database operations, storage and payment workflows must be implemented and tested before production use.

Never place a Supabase service-role key or payment secret in browser code or a `NEXT_PUBLIC_` variable.
