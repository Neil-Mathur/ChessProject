# Component: Online Multiplayer

**Location:** `server.ts`, `src/server/socket/`, `src/multiplayer/`, `src/components/multiplayer/`, `src/app/lobby/`, `src/app/play/`

---

## Overview

The multiplayer feature enables real-time play between two players on different devices. It is built on Socket.IO with a server-authoritative model: the server validates every move using the same chess engine, then broadcasts the new state to both players.

The entire feature is gated behind two environment variables (`MULTIPLAYER` and `NEXT_PUBLIC_MULTIPLAYER`). When these are not set, the multiplayer code is never loaded, no socket server starts, and the routes redirect to `/`. See the [operations guide](./operations.md) for how to enable it.

---

## Architecture

```
Ubuntu VM
│
├── server.ts  ─── HTTP server (Next.js + optional Socket.IO)
│   │
│   └── src/server/socket/index.ts   ← Socket.IO handlers (server-side)
│       └── src/server/socket/gameRoom.ts   ← in-memory room state
│
└── Next.js app
    ├── /lobby  →  src/components/multiplayer/Lobby.tsx
    └── /play/[roomId]  →  src/components/multiplayer/OnlineGame.tsx
        └── OnlineBoardPanel.tsx   ← board UI (no useGameStore)

Client browser
├── src/multiplayer/socket.ts            ← singleton socket.io-client
└── src/multiplayer/useMultiplayerGame.ts  ← React hook
```

---

## Server-side

### Room state (`gameRoom.ts`)

Each game is a `Room` object held in a `Map<string, Room>`:

```typescript
interface Room {
  id: string              // 6-character uppercase code (e.g. "X7K2M9")
  variantId: string
  state: GameState        // current authoritative position
  players: { w: string | null; b: string | null }  // socket IDs
  tokens: { w: string | null; b: string | null }   // reconnect tokens
  moveLog: string[]
  result: GameResult | null
  createdAt: number       // for pruning
  cleanupTimer: ...       // setTimeout handle
}
```

Room IDs are random 6-character alphanumeric strings (uppercase). Tokens are 16-character random strings.

**Lifecycle:**
- Created when White calls `create_room`.
- Black's `token` is generated when they call `join_room`.
- If both players disconnect, a 5-minute cleanup timer starts. If neither reconnects, the room is deleted.
- A periodic job (every 30 minutes) prunes rooms older than 2 hours with no live players.

### Socket event handlers (`socket/index.ts`)

All events are validated and handled here. The server uses the same engine (`@/engine`) as the client.

| Event | Direction | Description |
|---|---|---|
| `create_room` | C→S | Creates a room; caller gets `RoomInfo` (including `playerToken`) |
| `join_room` | C→S | Joins as Black (fresh), or reconnects by token; returns `RoomInfo` |
| `move` | C→S | Submit a move; server validates and applies, then broadcasts `state_update` |
| `resign` | C→S | Forfeit the game; server broadcasts `game_over` |
| `opponent_joined` | S→C | Sent to the creator when the second player joins |
| `opponent_reconnected` | S→C | Sent when a disconnected opponent comes back |
| `opponent_disconnected` | S→C | Sent when the other player's socket closes |
| `state_update` | S→C | New `GameState`, move log, result, and the last move applied |
| `game_over` | S→C | Sent to both players when the game ends (checkmate, stalemate, resign) |
| `error` | S→C | Sent to the requesting client on recoverable errors |

**Move validation:** The server calls `variant.legalMoves(state)` and finds the move matching `from`, `to`, `promotion`, and `drop`. Illegal moves are silently dropped. The client never directly modifies state; it only sends a move and waits for `state_update`.

---

## Client-side

### Socket singleton (`multiplayer/socket.ts`)

Creates a single `socket.io-client` instance, lazily, with `autoConnect: false`. The socket only connects when `getSocket().connect()` is explicitly called (in the Lobby or when joining a game). This avoids opening a socket connection on the local-game page.

### `useMultiplayerGame` hook (`multiplayer/useMultiplayerGame.ts`)

The main client-side data source for online games. Takes a `roomId` and returns:

```typescript
{
  state: GameState | null
  variant: Variant | null
  myColor: Color | null
  moveLog: string[]
  result: GameResult | null
  status: "connecting" | "waiting" | "playing" | "over" | "disconnected" | "error"
  statusMessage: string
  sendMove: (move: Move) => void
  resign: () => void
}
```

**On mount:**
1. Connects the socket if not already connected.
2. Reads `sessionStorage[mp_token_<roomId>]` (the reconnect token, if any).
3. Emits `join_room` with the room ID and token.
4. On response: sets local state, saves token to `sessionStorage`, determines initial status.

**Token storage:** `sessionStorage` (not `localStorage`) — tokens are tab-scoped and cleared when the browser tab closes. The key is `mp_token_<roomId>`.

**Reconnect:** If the user closes the tab and opens the same `/play/<roomId>` URL within 5 minutes, the hook reads the saved token and sends it with `join_room`. The server matches it to the correct color slot.

**Status transitions:**

```
connecting → waiting (creator, no opponent yet)
           → playing (joiner, or creator after opponent_joined)

waiting → playing (on opponent_joined)

playing → over (on state_update with result, or game_over)
        → disconnected (on opponent_disconnected)

disconnected → playing (on opponent_reconnected)
```

---

## UI components

### Lobby (`components/multiplayer/Lobby.tsx`)

- **Create game:** Variant selector + "Create game" button. On click: connects socket, emits `create_room`, saves token to `sessionStorage`, navigates to `/play/<roomId>`.
- **Join game:** Code input + "Join" button (or Enter key). On click: same flow but emits `join_room` with the entered code.
- Error messages displayed inline if connection fails or room is full/not found.

### OnlineGame (`components/multiplayer/OnlineGame.tsx`)

Full page layout for an active online game:
- **Status bar:** shows `statusMessage` with a "Copy code" button during the waiting phase.
- **Board:** `OnlineBoardPanel` (board locked when it is the opponent's turn or game is over)
- **Side panel:** turn indicator, scrollable move log, Resign button (during play), "New game" link (after game ends)
- **Result banner:** "You win!" / "You lose" / "Draw" with the reason

### OnlineBoardPanel (`components/multiplayer/OnlineBoardPanel.tsx`)

A self-contained board component for online play. Does not use `useGameStore` at all — all state comes from `useMultiplayerGame` via props:

```typescript
props: {
  state: GameState
  variant: Variant
  myColor: Color
  result: GameResult | null
  locked: boolean         // true when opponent's turn or game over
  onMove: (move: Move) => void
}
```

Supports the full interaction model (click-to-move, drag-and-drop, Crazyhouse pockets, promotion dialog). Board orientation is always fixed to `myColor` (your pieces at the bottom). Calls `onMove(move)` instead of writing to the store; the move is sent to the server and state only updates on `state_update`.

---

## Shared protocol types (`multiplayer/protocol.ts`)

Typed definitions for all Socket.IO events (both directions), used by both the server (`src/server/socket/index.ts`) and the client (`useMultiplayerGame`). Changing the protocol requires updating this file.

---

## Enabling multiplayer on Ubuntu

See [operations.md](./operations.md) for step-by-step start/stop instructions.

The short version:
```bash
npm run build          # must rebuild when switching to multiplayer mode
npm run start:multi    # starts Next.js + Socket.IO on the same port
```

No separate process or reverse proxy configuration is needed for Socket.IO — it attaches to the same HTTP server as Next.js.
