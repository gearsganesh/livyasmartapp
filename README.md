# LIVYA CureHub

React + Vite + Tailwind frontend, Express REST API, PostgreSQL/Supabase database.

## Deployment notes
- Supabase project URL: https://wbwbvyhvxynfcvisgiun.supabase.co
- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the frontend hosting environment.
- Never put a Supabase secret/service-role key in the browser.
- Run database migrations in staging before applying to production.
- Set up authentication, row-level security and authorization policies before using real clinical data.

This repository is being initialized with a full source structure and migration baseline. Do not enter real patient data until security and workflow verification is complete.
