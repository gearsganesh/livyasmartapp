# LIVYA CureHub delivery status

## Present in the repository
- React/Vite client application under `client/`.
- Express API under `server/`.
- Prisma PostgreSQL schema under `server/prisma/schema.prisma`.
- Authentication/session code with HTTP-only cookies and a three-hour session lifetime.
- Initial GitHub Actions CI workflow at `.github/workflows/ci.yml` to build the client, validate/generate Prisma, and syntax-check backend JavaScript.

## Verified deployment/database status
- Source is committed to the `main` branch.
- A CI run was triggered by the latest push; its final result must be checked before treating build/schema checks as passed.
- No SQL migration file currently exists under `server/prisma/migrations/`. The directory contains only its README and migration lock file. Do not run `prisma migrate deploy` until a real initial migration is generated and reviewed.
- The user's designated Supabase project is `ekyvogemusxmgeefrqmc` (Livya Smart App). The connected Supabase integration currently returns a permission error for that project. Do not substitute another Supabase project.
- No LIVYA project was found in the connected Vercel account. Production deployment and custom-domain mapping remain unverified.
- Repository visibility is currently public. Because this is healthcare application source, change it to private before adding deployment configuration or patient-related implementation details.

## Not yet verified
- Client production build.
- Prisma schema validation and client generation.
- Initial SQL migration generated from the exact Prisma schema.
- Database schema installation on the designated Supabase project.
- Superadmin bootstrap and first login.
- API deployment, client/admin deployments, custom domains, cookies/CORS across domains.
- Integration tests for permissions, patient data isolation, session expiry/revocation, and CRUD operations.

## Required order of work
1. Make the GitHub repository private.
2. Restore access to the designated Supabase project `ekyvogemusxmgeefrqmc`.
3. Run and inspect the GitHub Actions CI result; fix any failures.
4. Generate the initial Prisma migration from the current schema using Prisma CLI, review it, and commit the SQL.
5. Test the migration against a disposable PostgreSQL database, then apply it only to the designated Supabase project.
6. Bootstrap a Superadmin using a unique password and remove bootstrap environment values.
7. Deploy the API and client/admin apps, configure secrets in hosting settings, and map `app.livyacurehub.com` and `admin.livyacurehub.com`.
8. Complete security and end-to-end tests with synthetic data before clinical use.

## Safety note
No production readiness or clinical certification is implied. Never commit database passwords, JWT secrets, service-role keys, patient data, or real clinical records.
