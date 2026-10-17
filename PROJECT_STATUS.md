# LIVYA CureHub delivery status

## Current architecture
- Frontend: React/Vite in `client/`, hosted on Vercel at `app.livyacurehub.com`.
- Authentication: Supabase Auth email/password with the user's UUID mapped to `public."User".id`.
- Data access: Supabase PostgREST directly from the browser, protected by PostgreSQL Row Level Security (RLS).
- Privileged user provisioning: Supabase Edge Function `admin-users` with JWT verification enabled; the service-role key remains server-side.
- No separate Express API domain is required for Option A. The legacy Express/Prisma backend remains in the repository but is no longer called by the frontend.
- The frontend implements a three-hour local session timeout; RLS role resolution and the admin Edge Function also check the age of the underlying Supabase Auth session.

## Hosted Supabase project
- Project: `livyasmartapp`, reference `wbwbvyhvxynfcvisgiun`, region Mumbai (`ap-south-1`).
- 26 application tables exist; all 26 have RLS enabled.
- 55 policies were present after the initial RLS setup. Role-specific write policies and sensitive-read restrictions were subsequently tightened.
- Supabase Edge Function `admin-users` is deployed and active, version 4, with JWT verification enabled.
- No user profiles or initial Superadmin accounts have been created yet.
- The old `Livya HIMS` project was not modified.

## Source changes on main
- Supabase JS dependency and browser client configuration.
- Login/session provider switched from Express cookies to Supabase Auth.
- Generic resource CRUD and dashboard queries switched to Supabase direct data access.
- Admin account listing/creation/status changes route through the `admin-users` Edge Function.
- Supabase SQL migrations are versioned under `supabase/migrations/`, with filenames aligned to the applied migration versions.
- `SUPABASE_SETUP.md` documents the new deployment architecture and remaining configuration.

## Not yet verified / still required
- Latest GitHub Actions CI build was still running at last check; wait for a successful run before relying on the current code.
- Configure the Supabase publishable/anon key as `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy the frontend. This key is browser-safe; never use the service-role key.
- Configure Supabase Auth Site URL and redirect URLs for `https://app.livyacurehub.com`.
- Create two initial Superadmin Auth users and matching `public."User"` profiles with unique strong passwords.
- Test login, refresh persistence, logout, three-hour expiry, user management, and CRUD for each role using synthetic data.
- Perform a complete RLS penetration/negative test: clients must not access another client's data, and each staff role must be restricted to its intended resources.
- Vercel project access was not available through the connected tools, so no Vercel environment variables or deployment settings were changed by this workflow.
- Repository visibility is still public. Make it private before using real clinical data.

## Safety
The app is not yet production-ready for real clinical data. Do not commit service-role keys, database credentials, passwords, or patient data. UI visibility is not authorization; RLS is the database security boundary.
