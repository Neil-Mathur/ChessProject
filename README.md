# Chess Variants

A web app for playing chess and chess variants. Local two-player on one device,
or against a built-in computer opponent, with **Standard Chess**, **Monster
King Chess**, and **Crazyhouse**, plus board/piece skins.

Done so far: **Phase 1** (board, variants, skins), **Phase 2** (AI opponent),
and **Phase 3** (Google sign-in + preference sync).

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind v4**
- **react-chessboard v5** — board rendering only (no rule enforcement)
- **Zustand** — game state (`gameStore`) and persisted preferences (`preferences`)
- Custom, framework-agnostic **rules engine** in `src/engine`

## Run

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run test:engine  # deterministic engine self-test
```

## Setup (auth & database)

1. Copy env vars: `cp .env.example .env` and `cp .env.example .env.local`
   (Prisma CLI reads `.env`; the Next runtime reads `.env.local`).
2. Generate an auth secret into `.env.local`: `npx auth secret` (or any random
   string for `AUTH_SECRET`).
3. Create the dev database: `npx prisma migrate dev`.
4. `npm run dev`. In development a **Dev Login** button signs you in without
   Google (it never appears in production).
5. For real Google sign-in, create an OAuth client at
   <https://console.cloud.google.com> (redirect URI
   `http://localhost:3000/api/auth/callback/google`) and set `AUTH_GOOGLE_ID`
   / `AUTH_GOOGLE_SECRET` in `.env.local`. The "Sign in with Google" button
   appears automatically once both are set.

**Production database:** change `provider` in `prisma/schema.prisma` to
`postgresql`, point `DATABASE_URL` at Postgres (Neon/Supabase), and run
`prisma migrate deploy`. The models are unchanged.

## Architecture

The engine is pure TypeScript with no React/DOM dependencies, so it can later
run on a server (online multiplayer) or inside an AI worker unchanged.

```
src/engine/
  types.ts          Color, Piece, Move, GameState, GameResult
  board.ts          square math, FEN export, piece placement
  moveGen.ts        pseudo-legal move generation, attack detection,
                    shared move application + multi-move turn budget
  variant.ts        the Variant interface (the extension point)
  variants/
    standard.ts     standard chess (checkmate / stalemate)
    monsterKing.ts  Monster King (2 black moves, capture-the-king)
    crazyhouse.ts   Crazyhouse (captured pieces switch sides and can be dropped)
    index.ts        variant registry
  ai/
    evaluate.ts     static evaluation (White's perspective)
    search.ts       alpha-beta minimax over the variant's own move generation
```

### AI opponent (Phase 2)

A built-in **alpha-beta** engine (`src/engine/ai`) runs in a Web Worker
(`src/ai/aiWorker.ts`, driven by `botClient.ts` + `AIController.tsx`). Because it
searches via `Variant.legalMoves` / `applyMove` and evaluates from White's
perspective (White maximizes, Black minimizes), it works for **every** variant —
including Monster King's two-moves-per-turn and capture-the-king rules — with no
special-casing. Difficulty = search depth. Each side can be set to Human or
Computer independently. (Stockfish can be added later behind the same worker
boundary for stronger standard-chess play.)

### Two key design decisions

1. **Turn = a move budget, not a single ply.** `GameState.movesRemaining`
   tracks plies left in the current side's turn. `Variant.movesPerTurn(color)`
   defines it (Monster King: white = 1, black = 2). This generalizes to any
   future multi-move variant.

2. **Legality is the variant's job.** `moveGen` produces *pseudo-legal* moves.
   Standard chess filters out moves that leave its own king in check; Monster
   King has no check at all, so pseudo-legal == legal and the game ends only
   when a king is captured (`findKing` returns -1).

3. **Optional state extensions stay opt-in.** Crazyhouse adds `GameState.pockets`
   (pieces in hand) and `Move.drop`; both are optional, so Standard and Monster
   King are unaffected. Drops reuse the shared board application + the standard
   `filterLegal` check filter, and a promoted pawn reverts to a pawn when
   captured (`Piece.promoted`).

### Adding a new variant

1. Implement the `Variant` interface in `src/engine/variants/yourVariant.ts`.
2. Register it in `src/engine/variants/index.ts`.

It then appears in the variant selector and works with all skins automatically —
nothing in the UI hard-codes variant rules.

### Skins

Board themes (`src/theme/boardThemes.ts`) and piece sets
(`src/theme/pieceSets.tsx`) are pure data, independent of rules, so every
variant is skinnable. Adding an image-based set (e.g. cburnett, alpha) means
adding one `PieceSet` entry that returns artwork per piece code.

### Auth & preferences (Phase 3)

- **Auth.js (NextAuth v5)** with the **Prisma adapter** ([auth.ts](src/auth.ts)).
  Google provider (shown only when configured) plus a dev-only Credentials
  "Dev Login". JWT sessions (required for credentials; the adapter still
  persists OAuth users).
- **Prisma** ([schema.prisma](prisma/schema.prisma)) — SQLite in dev, Postgres
  in prod. Auth.js tables + a one-per-user `Preferences` row.
- **Sync** ([PreferenceSync.tsx](src/components/PreferenceSync.tsx)) — on
  sign-in, loads the user's prefs from the DB (seeding from local values if
  none), then debounce-saves on change via [`/api/preferences`](src/app/api/preferences/route.ts).
  Signed-out users keep using `localStorage`.

## Online multiplayer (Phase 4)

The multiplayer feature ships as a **dark flag** — it is completely inert unless
you opt in. Nothing in the base app imports it.

### Turning it on

```bash
npm install               # installs socket.io + socket.io-client
npm run dev:multi         # dev server + Socket.IO on port 3000
npm run start:multi       # production (Ubuntu VM)
```

Set `MULTIPLAYER=true` and `NEXT_PUBLIC_MULTIPLAYER=true` in your env (or let
the `dev:multi` / `start:multi` scripts do it via cross-env). The "Play online"
nav link and `/lobby` + `/play/[roomId]` routes appear only when the flag is on.

### Turning it off (dark)

Unset both env vars (or don't run the `*:multi` scripts). Zero runtime cost:
the socket server never starts, `socket.io-client` is never loaded, the routes
redirect to `/`.

### Architecture

```
server.ts                         custom HTTP server; attaches Socket.IO when MULTIPLAYER=true
src/
  server/socket/
    index.ts                      Socket.IO event handlers (server-authoritative move validation)
    gameRoom.ts                   in-memory room state + reconnect tokens
  multiplayer/
    protocol.ts                   shared ClientToServer / ServerToClient event types
    socket.ts                     singleton socket.io-client (lazy, never auto-connects)
    useMultiplayerGame.ts         React hook: join room, receive state, send moves
  components/multiplayer/
    Lobby.tsx                     create / join room UI
    OnlineBoardPanel.tsx          board for online play (no useGameStore dependency)
    OnlineGame.tsx                full online game page layout
  app/
    lobby/page.tsx                /lobby route (guarded)
    play/[roomId]/page.tsx        /play/[roomId] route (guarded)
```

**Server is authoritative.** The client sends a `Move` object; the server
validates it with the same engine, applies it, and broadcasts the new
`GameState` to both players. Illegal moves are silently dropped.

**Reconnect.** Each player gets a `playerToken` (stored in `sessionStorage`
keyed by room ID). Re-joining the same room URL with the token reclaims the
correct color slot without needing an account.

**Room lifecycle.** Rooms live in memory on the server. If both players
disconnect, the room is deleted after 5 minutes. A 30-minute pruning job clears
rooms older than 2 hours. (Server restarts lose active games — add DB persistence
in a later phase if needed.)

## Roadmap

- **Phase 5** — More variants.
- **Later** — Stockfish (WASM) as a stronger standard-chess engine option.
- **Later** — Persist online game history to the DB.

## Known Phase-1 limitations / decisions to confirm

- **Promotion auto-queens.** A promotion picker is a small follow-up.
- **Monster King rule details to confirm:** White currently castles normally
  (no check restriction, since the variant has no check); Black cannot castle
  (no rooks). Black may spend both moves on the same piece.
- **En passant** is valid for exactly the one ply after a double push — an
  approximation in multi-move turns; refine if needed.
