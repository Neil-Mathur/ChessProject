# Component: State Management

**Location:** `src/store/`

The app uses two Zustand stores. Both are client-side only.

---

## useGameStore (`store/gameStore.ts`)

Holds the live game state. Not persisted — resets on page reload.

### Shape

```typescript
{
  variant: Variant           // active variant object (has legalMoves, applyMove, etc.)
  state: GameState           // current board position
  history: GameState[]       // stack of previous positions (for undo)
  moves: Move[]              // every move applied this game
  moveLog: string[]          // algebraic notation for each move
  result: GameResult | null  // set when the game ends
  thinking: boolean          // true while the AI worker is computing
  gameId: number             // incremented on newGame; used to re-key components
}
```

### Actions

#### `newGame(variantId)`
Initialises the variant via `getVariant(variantId)`, calls `variant.setup()`, and resets all state. Increments `gameId`.

#### `tryMove(from, to, promotion?)`
Parses square names, finds a legal move matching `from → to` in `variant.legalMoves(state)`, and calls `commitMove`. Returns `false` if no legal move matches. If multiple moves match (only possible for promotions), selects the one matching the requested promotion piece, falling back to queen.

#### `tryDrop(pieceType, to)`
Crazyhouse-specific. Finds a legal drop move matching `drop === pieceType && to === toSq` and calls `commitMove`. Returns `false` if not legal.

#### `commitMove(move)`
The single point of truth for applying a move. Called by `tryMove`, `tryDrop`, and `AIController`.
1. Generates algebraic notation via `describeMove(state, move)`.
2. Calls `variant.applyMove(state, move)` to produce the next state.
3. Calls `variant.result(next)` to check for a game-ending condition.
4. Updates `state`, `history`, `moves`, `moveLog`, `result`.

#### `undo()`
Pops the last entry from `history`, restores the previous `state`, and removes the last move from `moves` and `moveLog`. Clears `result` and `thinking`.

#### `setThinking(v)`
Set to `true` by `AIController` before dispatching to the worker; set to `false` when the response arrives.

### Selector helpers

These are exposed as functions on the store (not computed state) to avoid unnecessary re-renders.

| Helper | Returns |
|---|---|
| `legalTargets(from)` | Array of target square names for the piece on `from` |
| `isPromotion(from, to)` | `true` if the move `from→to` includes a promotion |
| `legalDropTargets(pieceType)` | Array of square names where `pieceType` may be dropped |

### `deriveCaptured(moves, history)` (exported utility)

Not part of the store. Called by `CapturedPanel` to derive `{ w: Piece[], b: Piece[] }` from the move history.

### Move notation

`describeMove(state, move)` handles:
- Drop moves: `P@h6` (piece type + `@` + target)
- Castling: `O-O` / `O-O-O`
- Pawn captures: `exd5`
- Promotions: `e8=Q`
- Piece moves: `Nf3`, `Rxd8`

---

## usePreferences (`store/preferences.ts`)

Holds user settings. Persisted to `localStorage` via Zustand's `persist` middleware under the key `chess-preferences`. Survives page reloads.

### Shape

```typescript
{
  variantId: string        // active variant (default: "monster-king")
  boardThemeId: string     // board skin (default: "green")
  pieceSetId: string       // piece skin (default: "default")
  orientation: "white" | "black"   // which colour is at the bottom (default: "white")
  aiWhite: boolean         // is White computer-controlled? (default: false)
  aiBlack: boolean         // is Black computer-controlled? (default: false)
  aiDepth: number          // search depth / difficulty (default: 3)
}
```

### Actions

All setters follow the pattern `setX(value) → set({ x: value })`:
`setVariant`, `setBoardTheme`, `setPieceSet`, `setOrientation`, `setAiWhite`, `setAiBlack`, `setAiDepth`.

### Preference sync

When a user is signed in, `PreferenceSync` (a headless React component) loads the DB row on sign-in and debounce-saves on any change. The DB values always overwrite local values on sign-in. See [component-auth.md](./component-auth.md) for the full sync flow.

---

## How the stores interact

```
usePreferences.variantId
        │
        ▼
ControlsPanel.selectVariant()
        │
        ▼
useGameStore.newGame(variantId)   ← starts a new game with the selected variant

usePreferences.aiWhite / aiBlack / aiDepth
        │
        ▼
AIController                      ← reads preferences to decide whether to fire the worker

useGameStore.state
        │
        ▼
BoardPanel                        ← renders position from state
AIController                      ← triggers on state change
```

The two stores are independent. `useGameStore` never reads from `usePreferences` directly; the connection is through React components that subscribe to both.
