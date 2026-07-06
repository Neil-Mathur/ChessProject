# Chess Variants — Application Overview

## What the application does

Chess Variants is a web application for playing chess and chess variants. It supports local play (two people on one device), play against a built-in computer opponent, and optional real-time online play between two devices. Three rule sets ship out of the box: Standard Chess, Monster King Chess, and Crazyhouse.

Users can customise board and piece skins. Preferences are saved to `localStorage` automatically. When a user signs in with Google, their preferences are loaded from and saved to a database so they persist across devices.

---

## High-level architecture

```
Browser
│
├── Next.js App Router (src/app/)
│   ├── / ─────────────────────── Local game page
│   ├── /about ──────────────────── About page
│   ├── /settings ───────────────── Board/piece skin settings
│   ├── /lobby ─────────────────── Online multiplayer lobby   [flag-gated]
│   ├── /play/[roomId] ──────────── Online game page          [flag-gated]
│   └── /api/
│       ├── auth/[...nextauth]  ─── Auth.js session endpoints
│       └── preferences         ─── GET/PUT user preferences
│
├── React component tree
│   ├── Providers ──────────────── Banner + Nav + PreferenceSync wrapper
│   │   ├── Nav ────────────────── Sidebar (desktop) / bottom bar (mobile)
│   │   ├── PreferenceSync ──────── Headless; syncs prefs with DB when signed in
│   │   └── ChessGame ──────────── Root layout for local play
│   │       ├── BoardPanel ─────── Board + pocket bars + promotion dialog
│   │       ├── ControlsPanel ──── Variant selector + opponent/move log controls
│   │       └── AIController ───── Headless component; drives the AI worker
│   └── multiplayer/
│       ├── Lobby ──────────────── Create/join room UI
│       └── OnlineGame ─────────── Online game layout
│           └── OnlineBoardPanel ── Board wired to the socket hook
│
├── Zustand stores
│   ├── useGameStore ────────────── Live game state (board, moves, result)
│   └── usePreferences ─────────── User settings, persisted to localStorage
│
└── Engine (src/engine/ — no React or DOM dependencies)
    ├── types.ts ─────────────────── Core TypeScript types
    ├── board.ts ─────────────────── Square math, FEN export, piece placement
    ├── moveGen.ts ───────────────── Pseudo-legal move generation, shared utilities
    ├── variant.ts ───────────────── Variant interface (the extension point)
    ├── variants/ ────────────────── Standard, Monster King, Crazyhouse
    └── ai/
        ├── evaluate.ts ──────────── Static evaluation (material + positional)
        └── search.ts ────────────── Alpha-beta minimax

Server (when MULTIPLAYER=true — server.ts)
└── Socket.IO
    ├── src/server/socket/index.ts ── Event handlers + authoritative move validation
    └── src/server/socket/gameRoom.ts ─ In-memory room state
```

---

## Technology stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 |
| Board rendering | react-chessboard | v5 |
| State management | Zustand | v5 |
| Auth | Auth.js (NextAuth) | v5 beta |
| ORM | Prisma | v6 (pinned — v7 requires driver adapters) |
| Database (dev) | SQLite | via Prisma |
| Database (prod) | PostgreSQL | via Prisma |
| Real-time | Socket.IO | v4 |
| AI search | Custom alpha-beta | — |

---

## Data flow: local game

```
User clicks square
        │
BoardPanel.handleSquareClick()
        │
useGameStore.tryMove() / tryDrop()
        │
Variant.legalMoves()  ← engine validates legality
        │
Variant.applyMove()   ← engine produces next GameState
        │
useGameStore.state updated → React re-renders
        │
AIController detects it is computer's turn
        │
botClient.requestBestMove()  →  Web Worker (aiWorker.ts)
        │                            │
        │                     searchBestMove()
        │                     (alpha-beta over Variant)
        └──────── move ←───────────/
                  │
        useGameStore.commitMove()  → re-renders
```

---

## Data flow: online game

```
Player A                Server (Socket.IO)          Player B
────────               ─────────────────           ────────
create_room  ──────────►  Room created               
◄── RoomInfo (token)      state in memory
navigate /play/X7K2M9

                                                  join_room ──►
                                          ◄── RoomInfo (token)
                          opponent_joined ──────────────────►
◄── opponent_joined

move ─────────────────►  Validate with engine
                          applyMove → new GameState
◄── state_update ──────────────────────────────── state_update ──►
```

---

## Key design decisions

### 1. Turn = a move budget
`GameState.movesRemaining` tracks plies remaining in the current side's turn. `Variant.movesPerTurn(color)` sets this on turn start. Monster King sets Black's budget to 2; Standard sets both to 1. This generalises to any future multi-move variant with zero special-casing.

### 2. Legality is the variant's responsibility
`moveGen.ts` produces *pseudo-legal* moves (all geometrically valid moves with no check filter). Each variant's `legalMoves()` applies its own filter. Standard chess filters out moves that leave the king in check. Monster King does not filter at all (there is no check concept). Crazyhouse reuses Standard's filter and adds drop moves.

### 3. Optional state extensions stay opt-in
Crazyhouse adds `GameState.pockets` and `Move.drop`. Both fields are optional (`?`), so Standard and Monster King are completely unaffected at runtime.

### 4. Multiplayer is a dark flag
The entire multiplayer feature is inert unless `NEXT_PUBLIC_MULTIPLAYER=true` and `MULTIPLAYER=true` are set. No multiplayer code is imported by the local-game component tree. See [multiplayer.md](./multiplayer.md).

### 5. Server is authoritative for online play
The client sends a `Move` to the server. The server validates it against the engine, applies it, and broadcasts the resulting `GameState`. Illegal moves are silently dropped. The client only updates state on receipt of `state_update` from the server.

---

## Directory map

```
/
├── server.ts                    Custom HTTP entry (Next.js + Socket.IO)
├── prisma/schema.prisma         Database schema
├── docs/                        This documentation
└── src/
    ├── app/                     Next.js App Router pages and API routes
    ├── components/              React components
    │   └── multiplayer/         Online-game components (flag-gated)
    ├── engine/                  Pure TS rules engine (no React/DOM)
    │   ├── variants/            Standard, MonsterKing, Crazyhouse + registry
    │   └── ai/                  Evaluator + alpha-beta search
    ├── ai/                      Web Worker glue (aiWorker.ts, botClient.ts)
    ├── multiplayer/             Client socket singleton + useMultiplayerGame hook
    ├── server/socket/           Server-side Socket.IO handlers + room state
    ├── store/                   Zustand stores (gameStore, preferences)
    ├── theme/                   Board themes and piece sets (cosmetic data)
    ├── lib/prisma.ts            Prisma singleton
    └── auth.ts                  Auth.js configuration
```
