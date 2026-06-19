# Migrating from SQLite to PostgreSQL

The application uses SQLite in development and is designed to switch to PostgreSQL for production with minimal changes. All Prisma models are portable between both databases.

---

## When to do this

- When you are ready to go to production on your Ubuntu VM
- When you need multiple processes or server restarts to share a persistent database
- SQLite is fine for a single developer on a single machine; PostgreSQL is the right choice for a server that may restart, be backed up, or later run multiple instances

---

## Step 1 — Provision a PostgreSQL database

You have two options:

### Option A: Managed cloud database (recommended)

Both have a free tier sufficient for this app:

- **Neon** ([neon.tech](https://neon.tech)) — serverless Postgres, free tier includes 0.5 GB storage
- **Supabase** ([supabase.com](https://supabase.com)) — includes Postgres + a dashboard, free tier includes 500 MB

After creating a database, copy the connection string. It looks like:
```
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### Option B: Self-hosted PostgreSQL on the same VM

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createuser --interactive    # create a user (e.g. "chess")
sudo -u postgres createdb chessapp -O chess  # create the database
sudo -u postgres psql -c "ALTER USER chess PASSWORD 'yourpassword';"
```

Connection string:
```
postgresql://chess:yourpassword@localhost:5432/chessapp
```

---

## Step 2 — Update the Prisma schema

Open `prisma/schema.prisma` and change the `datasource` block:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

That is the only schema change required. All models (`User`, `Account`, `Session`, `VerificationToken`, `Preferences`) are identical for both databases.

---

## Step 3 — Update environment variables

In `.env` (for the Prisma CLI) and `.env.local` (for the Next.js runtime), replace the SQLite value:

```diff
-DATABASE_URL="file:./dev.db"
+DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

---

## Step 4 — Apply migrations to Postgres

The existing migration history in `prisma/migrations/` is SQLite-dialect. PostgreSQL has minor syntax differences, so the safest approach for a fresh production database is to apply the schema directly:

```bash
npx prisma migrate deploy
```

If `migrate deploy` fails with a SQL syntax error (rare but possible between dialects), use `db push` instead — it applies the current schema without running migration files:

```bash
npx prisma db push
```

`db push` is safe for an empty database. Do not use it on a database that already has data.

---

## Step 5 — Rebuild and restart

`DATABASE_URL` is not a `NEXT_PUBLIC_*` variable, so it is not inlined at build time. You do not need to rebuild for this change. Just restart the app:

```bash
pm2 restart chess
```

Or, if you also need to rebuild (e.g. you changed other env vars at the same time):

```bash
npm run build
pm2 restart chess
```

---

## Step 6 — Verify

```bash
# Check that Prisma can connect and the tables exist
npx prisma db pull    # should show the current schema with no differences

# Open Prisma Studio to browse the data
npx prisma studio
```

Sign in to the app and confirm that preferences are saved and loaded correctly.

---

## Data migration (if you have existing SQLite data)

If you want to carry over existing users and preferences from the SQLite dev database:

```bash
# Install the db-to-db migration tool
npm install -g @prisma/migrate

# Or use a simpler approach: export from SQLite, import to Postgres
sqlite3 prisma/dev.db .dump > dump.sql
# Edit dump.sql to remove SQLite-specific syntax (CREATE TABLE IF NOT EXISTS → CREATE TABLE, etc.)
psql $DATABASE_URL < dump.sql
```

For a personal project with a handful of users, it is usually simpler to have users re-configure their preferences than to migrate data.

---

## Keeping development on SQLite

You can run development with SQLite and production with PostgreSQL indefinitely. The recommended workflow:

```
.env           DATABASE_URL="file:./dev.db"           ← used by Prisma CLI in dev
.env.local     DATABASE_URL="file:./dev.db"           ← used by Next.js in dev
```

On the production server:
```
.env.local     DATABASE_URL="postgresql://..."        ← production Postgres
.env           DATABASE_URL="postgresql://..."        ← for `prisma migrate deploy`
```

The `provider` in `schema.prisma` must match the database being used. If you switch it to `postgresql`, the Prisma CLI will no longer work locally with the SQLite file. One way to handle this cleanly:

**Keep two schema files** (optional, for teams):
```
prisma/schema.prisma          ← committed, set to postgresql (production)
prisma/schema.dev.prisma      ← local only, set to sqlite (not committed)
```

For a solo project, it is simpler to just update `schema.prisma` when deploying and revert locally.

---

## Prisma version note

The project pins Prisma to v6. **Do not upgrade to Prisma v7** without planning the migration — v7 requires "driver adapters" (a separate package, e.g. `@prisma/adapter-neon` for Neon Postgres), which changes the `PrismaClient` instantiation in `src/lib/prisma.ts` and the `auth.ts` adapter setup. The v6 path described in this document avoids that complexity.
