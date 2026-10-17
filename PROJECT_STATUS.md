# LIVYA CureHub delivery status

## Present in the repository
- React/Vite client application under `client/`.
- Express API under `server/`, exported from `server/src/app.js` for Vercel's native Express detection.
- Prisma PostgreSQL schema under `server/prisma/schema.prisma`.
- Initial schema migration generated from the Prisma schema: `server/prisma/migrations/20261017000000_initial_livya_schema/migration.sql`.
- Security migration `server/prisma/migrations/20261017010000_lock_down_public_data_api/migration.sql` enables RLS on all 26 application tables and revokes direct table grants from Supabase `anon` and `authenticated` roles when present. The app's Express API uses server-side Prisma access; browser clients must not query clinical tables directly.
- Authentication/session code with HTTP-only cookies and a three-hour session lifetime.
- GitHub Actions CI builds the client, validates and generates Prisma Client, generates/commits the initial migration, applies all migrations to a clean temporary PostgreSQL database, and syntax-checks backend JavaScript.

## Verified checks
- Client production build passed in GitHub Actions.
- Prisma schema validation passed.
- Prisma Client generation passed.
- Initial migration generation passed.
- `prisma migrate deploy` passed against a clean temporary PostgreSQL service with both migrations present.
- Backend JavaScript syntax checks passed.
- These checks validate the schema and build, not end-to-end clinical workflows or the hosted database.

## Hosted database status
- No migrations have been applied to any hosted Supabase project from this workflow.
- The previously designated project `ekyvogemusxmgeefrqmc` is not visible in the connected Supabase project list and returns a permission error when queried.
- The connected account does show `wbwbvyhvxynfcvisgiun` named `livyasmartapp`, but it has existing Supabase migration history while its `public` table listing is empty. Do not apply the LIVYA migrations there until the user confirms it is the intended project.
- Restore access to the intended Supabase project or confirm the correct project reference before applying migrations and bootstrapping the first Superadmin.

## Deployment status
- API code is prepared for a Vercel project rooted at `server/`; its package install generates Prisma Client.
- Frontend project root is `client/`. Set `VITE_API_URL=https://api.livyacurehub.com` for production.
- API production variables must be configured in Vercel: `DATABASE_URL`, a strong `JWT_SECRET` (32+ bytes), `CLIENT_ORIGINS=https://app.livyacurehub.com,https://admin.livyacurehub.com`, `COOKIE_NAME=livya_session`, and `ALLOW_PUBLIC_REGISTRATION=false`.
- No production deployment or custom-domain mapping has been performed. User intends to deploy through Vercel after the database is ready.
- Repository visibility is currently public. Change it to private before production setup because this is healthcare application source.

## Remaining before deployment
1. Change the GitHub repository to private.
2. Confirm access to the intended Supabase project.
3. Review the committed SQL migrations and apply them only to the confirmed project.
4. Create the initial Superadmin with a unique password of at least 16 characters, then remove bootstrap environment values.
5. Test login/logout, role enforcement, patient isolation, session expiry/revocation, and core CRUD workflows using synthetic data.
6. Deploy the API and frontend to Vercel, configure environment variables, and map custom domains.
7. Perform end-to-end smoke tests against the deployed API and frontend before using real clinical data.

## Safety note
No production readiness or clinical certification is implied. Never commit database passwords, JWT secrets, service-role keys, patient data, or real clinical records.
