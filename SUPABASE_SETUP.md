# LIVYA CureHub deployment and Supabase setup

## Designated Supabase project
- Project reference: `ekyvogemusxmgeefrqmc` (Livya Smart App).
- Use this project only for the fresh LIVYA Smart App. Do not modify the old Livya HIMS project or substitute another Supabase project.
- Current connected Supabase access returns a permission error for the designated project. Database work is blocked until the account/organization access is corrected.
- Do not assume the application tables are installed. The repository currently has a Prisma schema but no initial SQL migration file.

## Architecture
The app is React/Vite -> Express REST API -> Prisma -> PostgreSQL. Authentication is implemented in the Express API using a JWT in an HTTP-only cookie and a database-backed session. Do not add a second browser-side Supabase Auth flow without deliberately redesigning authentication.

The browser-safe Supabase publishable key is not a database password and must not be placed in `DATABASE_URL`. The frontend should call the Express API.

## API hosting environment
Configure these values in the API hosting provider's secret/environment settings. Do not commit actual values:

```dotenv
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:[URL_ENCODED_PASSWORD]@[DESIGNATED_PROJECT_DB_HOST]:5432/postgres?sslmode=require
JWT_SECRET=[random-secret-at-least-32-bytes]
CLIENT_ORIGINS=https://app.livyacurehub.com,https://admin.livyacurehub.com
COOKIE_NAME=livya_session
ALLOW_PUBLIC_REGISTRATION=false
```

Use the connection string from the designated Supabase project's Dashboard -> Connect. Prefer the provider-recommended pooler URL if required by the hosting runtime. URL-encode special characters in the password.

## Migration and bootstrap order
1. Restore access to project `ekyvogemusxmgeefrqmc`.
2. Run the repository CI checks and resolve failures.
3. Generate an initial SQL migration from `server/prisma/schema.prisma` with Prisma CLI. Review the SQL and commit it under `server/prisma/migrations/`; do not invent or hand-edit an incomplete schema migration.
4. Validate and test the migration against a disposable PostgreSQL database.
5. Apply the reviewed migration to the designated project only.
6. Bootstrap a Superadmin with a unique password of at least 16 characters using the seed script's required environment variables; remove bootstrap variables afterwards.
7. Test role enforcement, patient isolation, session expiry, logout revocation, and CRUD operations with synthetic data.

## Deployment
- Client: Vercel project rooted at `client/`, production domain `app.livyacurehub.com`.
- Admin: configure a separate deployment only after verifying that the current frontend actually has an admin route/entry point suitable for a separate hostname; target domain `admin.livyacurehub.com`.
- API: deploy the Express service to a Node-compatible host and set `CLIENT_ORIGIN`, database URL, and JWT secret there.
- The API now accepts a comma-separated `CLIENT_ORIGINS` allowlist (both `https://app.livyacurehub.com` and `https://admin.livyacurehub.com`). Keep the origins exact, with no trailing slash. `CLIENT_ORIGIN` remains as a single-origin fallback for older deployments.
- Ensure HTTPS and cookie `Secure` in production before testing cross-domain sessions.

Never commit database passwords, JWT secrets, service-role keys, or real patient/clinical data.
