# LIVYA CureHub: Supabase-first deployment

## Architecture

The production frontend is a Vite/React app hosted on Vercel at `https://app.livyacurehub.com`.

The browser connects directly to Supabase using the **publishable/anon key** and the `@supabase/supabase-js` client:
- Supabase Auth handles sign-in and persisted sessions.
- The Postgres Data API is used for app data, protected by Row Level Security (RLS).
- The `admin-users` Supabase Edge Function uses the service-role key only on the server to create staff/client Auth users, synchronize their `public."User"` profile, and manage account status.
- The service-role key must never be placed in Vercel frontend variables or committed to GitHub.
- There is no separate Express API domain in Option A. The legacy `server/` Express/Prisma implementation is retained in the repository for reference but is no longer the frontend runtime.

## Supabase project

- Project name: `livyasmartapp`
- Project reference: `wbwbvyhvxynfcvisgiun`
- URL: `https://wbwbvyhvxynfcvisgiun.supabase.co`
- Region: Mumbai (ap-south-1)

Do not use the old `Livya HIMS` project for this app.

## Vercel frontend settings

Project root: `client/`

Set these variables in **Production, Preview and Development as appropriate**:

```dotenv
VITE_SUPABASE_URL=https://wbwbvyhvxynfcvisgiun.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable/anon key>
VITE_ALLOW_PUBLIC_REGISTRATION=false
```

The publishable/anon key is designed for browser use; database security must come from RLS. Never use the service-role key here.

Redeploy the frontend after changing environment variables. Remove the obsolete `VITE_API_URL` setting because the frontend no longer calls the Express API.

## Database and RLS

The current project has 26 application tables. The Option A migration:
- Makes the legacy `passwordHash` column nullable; passwords are managed by Supabase Auth.
- Maps Supabase Auth user UUIDs to `public."User".id`.
- Enables RLS and revokes direct anonymous access.
- Grants only safe profile columns to authenticated browser clients.
- Adds staff/client access policies for clinical records and patient-linked resources.
- Keeps `Session` inaccessible to browser clients.

Review and version the applied migration under `supabase/migrations/` before treating the database as fully production-ready. Test every role with synthetic records. RLS is the real security boundary; hiding a menu item in React is not authorization.

## User accounts

The Edge Function `admin-users` is deployed with JWT verification enabled. It:
- Requires an authenticated active SUPERADMIN or ADMIN caller.
- Creates a Supabase Auth identity and matching `public."User"` profile.
- Requires a temporary password of at least 16 characters.
- Prevents regular admins from creating or modifying administrator accounts.
- Blocks self-deactivation and prevents deactivating the last active superadmin.

The two initial Superadmin identities still need to be created. For initial bootstrap, create each user in Supabase Dashboard -> Authentication -> Users, then insert a matching `public."User"` profile using the exact Auth user UUID. Do this only once, with secure unique passwords; do not place credentials in GitHub or chat. Example SQL for a user whose Auth UUID and email are already known:

```sql
INSERT INTO public."User"
  ("id", "email", "fullName", "role", "isActive", "passwordHash", "updatedAt")
VALUES
  ('<AUTH_USER_UUID>', '<EMAIL>', '<FULL_NAME>', 'SUPERADMIN', true, NULL, now());
```

Run this only in the correct project and replace placeholders with values from the Auth dashboard. Confirm the user email and UUID match before executing. Do not insert a profile until the Auth user exists.

## Edge Function

Function name: `admin-users`

It uses Supabase's server-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Set `APP_ORIGIN=https://app.livyacurehub.com` in the function secrets if you need to explicitly pin the CORS origin. Never expose the service-role key.

The function is already deployed to `wbwbvyhvxynfcvisgiun`. The source is versioned in `supabase/functions/admin-users/index.ts`.

## Production validation checklist

- [ ] Configure `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy.
- [ ] Confirm Supabase Auth Site URL is `https://app.livyacurehub.com` and redirect URLs are restricted to the production app and approved development URLs.
- [ ] Confirm email/password auth is enabled and public sign-up remains disabled.
- [ ] Create the two initial Superadmin Auth users and matching profiles.
- [ ] Verify login, refresh persistence, logout, and disabled-account behavior.
- [ ] Verify the Edge Function can create a staff user and profile; verify regular admins cannot create admins.
- [ ] Test RLS with separate synthetic CLIENT, STAFF, CLINICIAN, ADMIN and SUPERADMIN accounts.
- [ ] Confirm one client cannot read another client's patients, appointments, prescriptions, records, messages, orders or lab bookings.
- [ ] Test create/update/delete operations for each permitted role.
- [ ] Confirm no browser bundle or Vercel frontend variable contains a service-role key, database password, or JWT secret.
- [ ] Make the GitHub repository private before using real clinical data.

Do not treat production as ready until the checklist is verified.
