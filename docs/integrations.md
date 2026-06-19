# Integrations

This document covers every third-party dependency that has runtime or configuration consequences — not build tools or type-only packages.

---

## react-chessboard (v5)

**Purpose:** Renders the chess board and handles drag-and-drop piece movement.
**Package:** `react-chessboard`
**Used in:** `BoardPanel.tsx`, `OnlineBoardPanel.tsx`

react-chessboard v5 uses an options-based API. The `<Chessboard options={{...}} />` component accepts:

| Option | What the app passes |
|---|---|
| `position` | FEN string from `toFen(state)` |
| `boardOrientation` | `"white"` or `"black"` based on preferences |
| `onPieceDrop` | Callback for drag-and-drop moves |
| `onSquareClick` | Callback for click-to-move |
| `pieces` | Optional `PieceRenderObject` for custom piece skins |
| `squareStyles` | Per-square CSS styles for move-target highlights |
| `darkSquareStyle` / `lightSquareStyle` | Board colour theme |
| `allowDragging` | `false` when the board is locked |

**Important:** react-chessboard is used only for rendering and interaction. It does not enforce any chess rules. All legality checking is done by the engine (`src/engine/`).

**Note on Node requirement:** react-chessboard v5 declares `engines.node >= 20.11.0`. The project runs on Node 18 with an engine-warning suppressed. This works in practice but upgrading Node to 20+ on the production VM is recommended.

---

## Zustand (v5)

**Purpose:** Lightweight client-side state management.
**Package:** `zustand`
**Used in:** `src/store/gameStore.ts`, `src/store/preferences.ts`

Two stores:
- `useGameStore` — live game state, not persisted
- `usePreferences` — user settings, persisted via the `persist` middleware

The `persist` middleware in `usePreferences` serialises the store to `localStorage` under the key `chess-preferences` on every change and rehydrates on page load. No server interaction is involved for signed-out users.

---

## Auth.js / NextAuth (v5 beta)

**Purpose:** Authentication and session management.
**Package:** `next-auth@^5.0.0-beta.31`
**Related:** `@auth/prisma-adapter`
**Used in:** `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/components/AuthButton.tsx`, `src/components/PreferenceSync.tsx`

Auth.js v5 is configured in `src/auth.ts`. It exposes four handlers mounted at `/api/auth/[...nextauth]` (catch-all route). These handle:
- Sign-in flows (OAuth redirect + callback, Credentials submission)
- Session reads (`/api/auth/session`)
- Sign-out
- CSRF tokens

**JWT sessions:** Session data is stored in a signed cookie (JWT), not in the database. This allows the Credentials (Dev Login) provider to work. OAuth accounts and users are still written to the database by the Prisma adapter.

**Session shape** (after the callbacks in `auth.ts`):
```typescript
session.user.id    // database user ID (added by the jwt/session callbacks)
session.user.name
session.user.email
session.user.image
```

**Providers:**
- Google — registered only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.
- Dev Login (Credentials) — registered only when `NODE_ENV !== "production"`.

---

## Prisma (v6)

**Purpose:** Database ORM and migration tool.
**Package:** `prisma` (CLI, devDep) + `@prisma/client` (runtime)
**Version pinned to v6:** Prisma v7 removed support for the traditional adapter model and requires "driver adapters" — a breaking change. v6 is stable and supports both SQLite and PostgreSQL without additional configuration.
**Used in:** `src/lib/prisma.ts`, `prisma/schema.prisma`, `src/app/api/preferences/route.ts`, `src/auth.ts`

**Schema location:** `prisma/schema.prisma`

**CLI commands:**
```bash
npx prisma migrate dev          # create + apply a new migration (dev only)
npx prisma migrate deploy       # apply pending migrations (production)
npx prisma studio               # web UI for browsing data
npx prisma generate             # regenerate the Prisma client after schema changes
```

**Singleton pattern:** `src/lib/prisma.ts` stores the `PrismaClient` instance on `globalThis` in development to prevent multiple instances during Next.js hot-reloads. Always import from `@/lib/prisma`.

---

## @auth/prisma-adapter

**Purpose:** Bridges Auth.js and Prisma — Auth.js calls the adapter to read/write users, accounts, and sessions.
**Package:** `@auth/prisma-adapter`
**Used in:** `src/auth.ts`

The adapter requires the standard Auth.js schema models (`User`, `Account`, `Session`, `VerificationToken`) to exist in `prisma/schema.prisma`. Do not rename or remove these models.

---

## Socket.IO (v4)

**Purpose:** Real-time bidirectional communication for online multiplayer.
**Packages:** `socket.io` (server), `socket.io-client` (browser)
**Used in:** `server.ts`, `src/server/socket/index.ts`, `src/multiplayer/socket.ts`, `src/multiplayer/useMultiplayerGame.ts`
**Active only when:** `MULTIPLAYER=true`

Socket.IO is attached to the same HTTP server that serves the Next.js app (see `server.ts`). No separate port or process is needed.

**Default Socket.IO path:** `/socket.io` — no custom path is configured, so this path must not be used by any Next.js API route.

**CORS:** Currently configured as `origin: "*"` in development. For production, restrict this to your domain:
```typescript
// src/server/socket/index.ts
cors: { origin: "https://yourdomain.com", methods: ["GET", "POST"] }
```

**Client auto-connect:** The client socket (`getSocket()`) is created with `autoConnect: false`. The socket only connects when `.connect()` is explicitly called (in the Lobby component), so no socket connection is opened on the local-game page.

---

## Tailwind CSS (v4)

**Purpose:** Utility-first CSS framework.
**Package:** `tailwindcss@^4`, `@tailwindcss/postcss`
**Used in:** All React components, `src/app/globals.css`

Tailwind v4 uses PostCSS and a native Rust binary (`@tailwindcss/oxide-win32-x64-msvc` on Windows). 

**Windows gotcha:** The optional native binary is not reliably installed by npm's optional-deps mechanism. After a clean `npm install` on Windows, if the build fails with `Cannot find native binding`, run:
```bash
npm install "@tailwindcss/oxide-win32-x64-msvc@4.x.x" --no-save
# Use the exact version shown in the error
```

**Custom classes:** `.btn` and `.select` are defined with `@layer components` in `globals.css`.

---

## tsx

**Purpose:** TypeScript execution for the engine self-test and the custom server.
**Package:** `tsx` (devDependency)
**Used for:**
- `npm run test:engine` — runs `src/engine/selftest.ts` directly
- `npm run dev:multi` / `npm run start:multi` — runs `server.ts` with TypeScript support and path alias resolution

tsx uses esbuild under the hood and respects `tsconfig.json` path aliases (`@/*`), so both scripts can import from `@/engine` etc.

---

## cross-env

**Purpose:** Cross-platform environment variable injection for npm scripts.
**Package:** `cross-env` (devDependency)
**Used in:** `package.json` `dev:multi` and `start:multi` scripts

```json
"dev:multi": "cross-env MULTIPLAYER=true NEXT_PUBLIC_MULTIPLAYER=true tsx server.ts"
```

On Linux/macOS the `VAR=value` syntax works natively. `cross-env` makes these scripts also work on Windows development machines.

---

## Google Fonts (Geist)

**Purpose:** Typography.
**Used in:** `src/app/layout.tsx`
**How:** Loaded via `next/font/google` at build time, self-hosted in the Next.js output. No runtime requests to Google's CDN. No configuration required.
