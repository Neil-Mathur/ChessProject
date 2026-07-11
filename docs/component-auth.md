# Component: Auth & Preference Sync

**Location:** `src/auth.ts`, `src/app/api/preferences/route.ts`, `src/lib/prisma.ts`, `src/components/AuthButton.tsx`, `src/components/PreferenceSync.tsx`

---

## Overview

Authentication is handled by Auth.js (NextAuth v5). Users can sign in with Google. A development-only "Dev Login" shortcut is available in non-production environments so the sync flow can be tested without real Google credentials.

When a user is signed in, their preferences (variant, skins, AI settings) are stored in a database row and synchronised on every change. Signed-out users use `localStorage` only.

---

## Auth.js configuration (`src/auth.ts`)

```
Providers configured at runtime:
  1. Google OAuth — added only when AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET are set
  2. Dev Login (Credentials) — added only when NODE_ENV !== "production"

Session strategy: JWT
  Required because the Credentials provider does not support database sessions.
  The Prisma adapter still persists OAuth users and accounts to the database.

Callbacks:
  jwt:     Attaches user.id to the JWT token on first sign-in
  session: Exposes token.id as session.user.id on every request
```

The four exported symbols — `handlers`, `auth`, `signIn`, `signOut` — are used throughout the app:

| Symbol | Used in |
|---|---|
| `handlers` | `src/app/api/auth/[...nextauth]/route.ts` — mounts the Auth.js HTTP endpoints |
| `auth` | `src/app/api/preferences/route.ts` — reads the session server-side |
| `signIn` / `signOut` | `src/components/AuthButton.tsx` — triggered by button clicks |

---

## Prisma adapter

The `PrismaAdapter(prisma)` call in `auth.ts` instructs Auth.js to store OAuth users, accounts, and sessions in the database. The required tables (`User`, `Account`, `Session`, `VerificationToken`) are defined in `prisma/schema.prisma`.

**Note:** Auth.js always uses the adapter for OAuth account persistence even when `session.strategy = "jwt"`. JWT means the session cookie is self-contained (no DB lookup per request), but initial sign-in still writes a `User` + `Account` row.

---

## Dev Login

Available only in development (`NODE_ENV !== "production"`). Calling it:
1. Upserts a user row with `email: "dev@example.com"`.
2. Returns that user, which Auth.js signs into a JWT session.

This means the session + preference sync flow works locally without a Google OAuth client configured.

To use it: run `npm run dev`, click "Dev Login" in the top-right.

---

## Preferences API (`src/app/api/preferences/route.ts`)

Two endpoints, both require an authenticated session (return 401 otherwise):

### `GET /api/preferences`
Returns the `Preferences` row for the current user, or `null` if none exists.

### `PUT /api/preferences`
Creates or updates the `Preferences` row for the current user. Accepts a JSON body with the fields below and validates/sanitises each one before writing:

```
variantId     String
boardThemeId  String
pieceSetId    String
orientation   "white" | "black"
aiWhite       boolean
aiBlack       boolean
aiDepth       number (defaults to 3 if invalid)
```

---

## PreferenceSync component (`src/components/PreferenceSync.tsx`)

Headless (renders `null`). Mounted inside `ChessGame` so it is always present during local play.

### Sign-in flow

```
useSession → status changes to "authenticated"
        │
        ▼
GET /api/preferences
        │
        ├── row exists → setState(dbValues)  ← DB overwrites local
        │
        └── no row yet → PUT /api/preferences ← seeds DB from local values
```

### Change-tracking flow

```
usePreferences.subscribe() watches for any store change
        │
        ▼  (only while signed in AND initial load is complete)
setTimeout(save, 600ms)   ← debounce
        │
        ▼
PUT /api/preferences
```

The `loaded` ref prevents saving before the initial load completes (which would overwrite DB values with potentially stale local values).

---

## Prisma singleton (`src/lib/prisma.ts`)

```typescript
// Prevents multiple PrismaClient instances during Next.js hot-reload in dev.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Always import `prisma` from `@/lib/prisma`, never instantiate `PrismaClient` directly.

---

## Database schema (auth-related models)

```prisma
model User {
  id            String       @id @default(cuid())
  email         String?      @unique
  name          String?
  image         String?
  accounts      Account[]
  preferences   Preferences?
}

model Preferences {
  id           String  @id
  userId       String  @unique
  variantId    String
  boardThemeId String
  pieceSetId   String
  orientation  String
  aiWhite      Boolean
  aiBlack      Boolean
  aiDepth      Int
  user         User    @relation(...)
}
```

`Account`, `Session`, and `VerificationToken` are standard Auth.js models — do not modify them.

---

## Admin page authorisation

The `/admin` page (`src/app/admin/page.tsx`) demonstrates the server-side authorisation pattern used for restricted pages:

```typescript
const ADMIN_EMAIL = "paritosh.mathur@gmail.com";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) redirect("/");
  // ... fetch and render data
}
```

Key points:

- **The check is server-side.** `auth()` reads the session from the JWT cookie on the server; the redirect happens before any database query runs, so restricted data never reaches an unauthorised client.
- **The nav link is cosmetic.** `Nav.tsx` hides the Admin link from non-admins using `useSession()` client-side, but that is a UX nicety, not security — anyone can type `/admin` into the URL bar and will simply be redirected.
- **Adding another admin** currently means editing the `ADMIN_EMAIL` constant in both `src/app/admin/page.tsx` and `src/components/Nav.tsx`. If more admins are ever needed, move the check to a role column on the `User` model or an env var.

---

## Setting up Google sign-in

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create an OAuth 2.0 Client ID (application type: Web application).
3. Add authorised redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
4. Copy the Client ID and Client Secret into `.env.local`:
   ```
   AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="your-client-secret"
   ```
5. Restart the dev server. The "Sign in with Google" button appears automatically.

The Dev Login button disappears in production — it is never registered when `NODE_ENV === "production"`.
