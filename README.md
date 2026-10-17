# LIVYA Cure Hub: Phase 3 + Phase 4 starter implementation

React + Vite + Tailwind CSS frontend, Express REST API, Prisma/PostgreSQL schema, JWT cookie sessions, and a role-aware clinical operations workspace.

## Modules included
Dashboard; patient directory; appointments; vital alerts; clinical records; prescriptions; medicines; nutrition assessments; programs; patient plans; consumption; AI review queue; therapies; therapists; therapy assignments; store catalogue; orders; lab partners; lab bookings; SOP library; messages; user provisioning; audit trail.

## Supabase project configuration
- Project: `livyasmartapp`
- Project URL: `https://wbwbvyhvxynfcvisgiun.supabase.co`
- Region: `ap-south-1`
- Database host: `db.wbwbvyhvxynfcvisgiun.supabase.co`
- This application uses the Express API and Prisma ORM for database access. The Supabase publishable key is not a database password and is not used by the Express/Prisma path. Do not put the database password, service-role key, or JWT secret in any `VITE_*` variable.
- Set `DATABASE_URL` on the API host using the Supabase Postgres connection string and the database password configured in Supabase. Prefer the Supabase pooler connection string for serverless or heavily scaled runtimes when recommended by the dashboard.

## Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or a compatible managed PostgreSQL database)
- A long random JWT secret (32+ bytes)

## Local setup
1. Copy `server/.env.example` to `server/.env` and configure `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_ORIGIN`.
2. `cd server && npm install`
3. `npx prisma generate`
4. `npx prisma migrate deploy` (applies the included initial SQL migration)
5. Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (at least 16 characters), and `BOOTSTRAP_ADMIN_NAME` in `server/.env`.
6. `npm run db:seed` once to create the initial SUPERADMIN. Remove bootstrap secrets after use.
7. `npm run dev`
8. In another terminal, copy `client/.env.example` to `client/.env`, configure `VITE_API_URL=http://localhost:4000`, then run `cd client && npm install && npm run dev`.

Frontend: http://localhost:5173. API health: http://localhost:4000/api/health.

## Production deployment
- Database: managed PostgreSQL (Supabase or Neon); use a connection string appropriate for the runtime and connection pool.
- API: Render/Railway or another Node host. Set all server environment variables. Run `npx prisma migrate deploy` as a release/pre-deploy command.
- Frontend: Vercel/Netlify static Vite build. Build command `npm run build`, output directory `dist`, set `VITE_API_URL` to the API origin.
- Prefer deploying frontend and API under the same registrable domain (for example `app.example.com` and `api.example.com`) to simplify secure cookie behavior. HTTPS is mandatory. Set `NODE_ENV=production`, `CLIENT_ORIGIN` exactly to the frontend origin, and keep `ALLOW_PUBLIC_REGISTRATION=false` unless the registration process has been explicitly approved.
- Use a shared rate-limit store for multiple API replicas. Configure backups, monitoring, secret rotation, and a documented incident-response process.

## Important implementation notes
- Session JWTs are held in HTTP-only cookies; the database stores a SHA-256 token hash so sessions can be revoked.
- Sessions have a hard three-hour expiry. Browser activity does not extend the expiry.
- CRUD resources use explicit input allowlists. Writes generate audit events.
- Public registration is disabled by default. Staff creation is restricted to ADMIN/SUPERADMIN and public registration can only create CLIENT users.
- The UI is a functional module-driven implementation matching the described LIVYA burgundy/ivory clinical workspace. A production build and pixel-by-pixel comparison against every screenshot have not been run in this environment.
- Clinical use requires a formal security/privacy review, clinical workflow validation, retention policies, secure document storage, backups, and tested recovery. Do not populate production with demo or fabricated patient records.
- Prescription items, order line items, and role permissions have schema-backed CRUD screens. Prescription signing, stock decrement/inventory transactions, secure document uploads, notifications, and module-specific clinical state-transition rules still require workflow-level implementation and acceptance testing before live clinical use.
