# Prisma migrations

The initial migration is generated from `server/prisma/schema.prisma` by the GitHub Actions workflow and committed under a timestamped directory. The workflow validates the schema, generates Prisma Client, and tests `prisma migrate deploy` against a clean temporary PostgreSQL database before committing the migration.

For local development:
- Install dependencies from `server/`.
- Run `npm run db:generate` after schema changes.
- Create future migrations with `npx prisma migrate dev --name descriptive_change` against a disposable/local development database.
- Commit both the Prisma schema and the generated migration directory.

For production:
- Use the designated LIVYA Smart App database only.
- Review the SQL and test migrations in a disposable PostgreSQL database before applying.
- Run `npm run db:migrate` (which runs `prisma migrate deploy`) only after the correct database connection is configured.
- Never run `prisma migrate dev` against production.
- Never commit database credentials or real clinical data.
