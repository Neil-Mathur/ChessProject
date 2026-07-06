# Environment Variables & Configuration

## File overview

| File | Who reads it | Purpose |
|---|---|---|
| `.env` | Prisma CLI only | `DATABASE_URL` for migrations |
| `.env.local` | Next.js runtime + Prisma CLI | All secrets and runtime config |
| `.env.example` | Reference only (committed) | Template for the above two files |

**Setup:** Copy `.env.example` to both `.env` and `.env.local`, then fill in values. The Prisma CLI reads `.env`; the Next.js server (and `server.ts`) reads `.env.local`. Keeping them in sync avoids surprises.

```bash
cp .env.example .env
cp .env.example .env.local
```

---

## All variables

### `DATABASE_URL`

**Required.** Connection string for Prisma.

| Environment | Value |
|---|---|
| Development (SQLite) | `file:./dev.db` |
| Production (PostgreSQL) | `postgresql://user:pass@host:5432/dbname?sslmode=require` |

The SQLite file path is relative to the `prisma/` directory when used by the Prisma CLI, but relative to the project root when used at runtime. The value `file:./dev.db` works for both.

---

### `AUTH_SECRET`

**Required.** A random string used to sign JWT session tokens and Auth.js cookies. Changing this value invalidates all existing sessions.

Generate with:
```bash
npx auth secret
# or
openssl rand -base64 32
```

Keep this secret. Never commit it. It lives in `.env.local` only.

---

### `AUTH_GOOGLE_ID`

**Optional.** The Client ID from a Google OAuth 2.0 credential.

When set (together with `AUTH_GOOGLE_SECRET`), the "Sign in with Google" button appears in the app. When absent, no Google button is shown and the code path is completely skipped.

Format: `1234567890-abc123.apps.googleusercontent.com`

---

### `AUTH_GOOGLE_SECRET`

**Optional.** The Client Secret from a Google OAuth 2.0 credential. Must be set alongside `AUTH_GOOGLE_ID`.

---

### `AUTH_TRUST_HOST`

**Required in production when running behind a reverse proxy (e.g. nginx).** Set to `"true"`.

Auth.js validates the `Host` header of incoming requests. Behind a proxy, the host seen by Next.js is `127.0.0.1:3000`, not the public domain, which causes an `UntrustedHost` error. Setting `AUTH_TRUST_HOST=true` (or `trustHost: true` in `auth.ts`) disables this check.

---

### `AUTH_URL`

**Required in production.** The canonical public URL of the app, e.g. `https://madchesslab.com`.

Auth.js uses this to construct OAuth redirect URIs and cookie paths. In development, it is inferred from the request.

---

### `MULTIPLAYER`

**Optional. Server-side only.** Set to `"true"` to attach Socket.IO to the HTTP server.

When set, `server.ts` dynamically imports `src/server/socket/index.ts` and binds Socket.IO to the same port as Next.js. When absent or any other value, Socket.IO is never loaded and the server behaves identically to `next start`.

This variable is **not** prefixed with `NEXT_PUBLIC_` — it is never exposed to the browser.

---

### `NEXT_PUBLIC_MULTIPLAYER`

**Optional. Browser-visible.** Set to `"true"` to activate the multiplayer UI.

Controls three things in the React app:

1. The "Play online" nav link in `ChessGame.tsx`.
2. The `/lobby` route (redirects to `/` if this is not `"true"`).
3. The `/play/[roomId]` route (same guard).

Because this variable is embedded at build time (Next.js inlines `NEXT_PUBLIC_*` at compile time), you must **rebuild** after changing it:

```bash
npm run build
```

Set both `MULTIPLAYER` and `NEXT_PUBLIC_MULTIPLAYER` together; having one without the other creates a broken state (socket server without UI, or UI without a socket server).

---

### `PORT`

**Optional.** Overrides the port the HTTP server listens on. Defaults to `3000`.

Used only by `server.ts` (the custom entry point). `next start` ignores this and uses its own `-p` flag.

---

### `HOSTNAME`

**Optional.** Overrides the bind address in `server.ts`. Defaults to `0.0.0.0` (all interfaces).

On a VM you typically want the default. To restrict to localhost (behind a reverse proxy): `HOSTNAME=127.0.0.1`.

---

### `NODE_ENV`

Set by npm scripts. `next dev` sets it to `"development"`; `next build` + `server.ts` in production sets it to `"production"`.

Affects:
- Dev Login availability (disabled when `"production"`)
- Prisma client singleton caching (cached globally in development to survive hot-reloads)
- Next.js development vs production behaviour

---

## Complete `.env.local` example

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth
AUTH_SECRET="replace-with-output-of-npx-auth-secret"

# Google OAuth (optional — leave blank to skip)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Production-only (required when running behind nginx or any reverse proxy)
AUTH_URL="https://yourdomain.com"
AUTH_TRUST_HOST="true"

# Online multiplayer (optional — both must be "true" to enable)
MULTIPLAYER=""
NEXT_PUBLIC_MULTIPLAYER=""
```

---

## Variable visibility matrix

| Variable | Prisma CLI | Next.js server | Browser bundle |
|---|---|---|---|
| `DATABASE_URL` | ✓ (via `.env`) | ✓ (via `.env.local`) | — |
| `AUTH_SECRET` | — | ✓ | — |
| `AUTH_GOOGLE_ID` | — | ✓ | — |
| `AUTH_GOOGLE_SECRET` | — | ✓ | — |
| `AUTH_URL` | — | ✓ | — |
| `AUTH_TRUST_HOST` | — | ✓ | — |
| `MULTIPLAYER` | — | ✓ | — |
| `NEXT_PUBLIC_MULTIPLAYER` | — | ✓ | ✓ (inlined at build) |
| `PORT` | — | ✓ (server.ts only) | — |
| `HOSTNAME` | — | ✓ (server.ts only) | — |

---

## Changing variables in production

- **Non-`NEXT_PUBLIC_` variables:** Update `.env.local`, restart the process (`pm2 restart chess` or equivalent). No rebuild needed.
- **`NEXT_PUBLIC_MULTIPLAYER`:** Update `.env.local`, rebuild (`npm run build`), then restart.
- **`DATABASE_URL` (Postgres migration):** See [postgres-migration.md](./postgres-migration.md).
