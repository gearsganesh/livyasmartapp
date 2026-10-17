# Supabase configuration for LIVYA CureHub

## Verified project

- Project name: `livyasmartapp`
- Project reference: `wbwbvyhvxynfcvisgiun`
- Project URL: https://wbwbvyhvxynfcvisgiun.supabase.co
- Region: `ap-south-1`
- Database host: `db.wbwbvyhvxynfcvisgiun.supabase.co`
- Current public schema: empty, ready for the application's Prisma migration.
- Supabase Auth's managed `auth` schema is untouched.

## Architecture

The application package uses React/Vite -> Express REST API -> Prisma -> PostgreSQL. Authentication is the Express JWT/HTTP-only cookie session implemented in the package, not Supabase Auth. Do not mix it with a second browser-side authentication flow.

The supplied `sb_publishable_...` value is a browser-safe Supabase publishable API key, but the present app does not call Supabase's browser Data API; it calls the Express API. Therefore this key is not a database password and does not belong in `DATABASE_URL`.

## API host environment

Set these as server-side environment variables in Render/Railway (never commit them):

```dotenv
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:[YOUR_DATABASE_PASSWORD]@db.wbwbvyhvxynfcvisgiun.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=[generate-a-random-secret-of-at-least-32-bytes]
CLIENT_ORIGIN=https://YOUR_FRONTEND_DOMAIN
COOKIE_NAME=livya_session
ALLOW_PUBLIC_REGISTRATION=false
```

Use the connection string supplied by Supabase Dashboard -> Connect if a pooler is recommended for the hosting runtime. URL-encode special characters in the password.

## Migration order

1. Review `server/prisma/schema.prisma` and the initial SQL migration in the source package.
2. Run `npx prisma validate` and `npx prisma generate`.
3. Verify migrations against a disposable PostgreSQL database first.
4. Set the API's `DATABASE_URL`, then run `npx prisma migrate deploy`.
5. Bootstrap a Superadmin using the package's seed command with a unique password, and remove bootstrap environment values afterwards.
6. Test role enforcement, patient isolation, session expiry, and CRUD operations with synthetic data before clinical use.

No service-role key, database password, or JWT secret belongs in the frontend or Git repository.
