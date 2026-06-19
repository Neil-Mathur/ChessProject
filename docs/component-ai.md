# Component: AI Opponent

**Location:** `src/engine/ai/`, `src/ai/`

The AI runs in a browser Web Worker so the UI remains responsive while the computer thinks. The engine is variant-agnostic: it searches through whatever `legalMoves` and `applyMove` the active variant provides, so it works for Standard chess, Monster King, and Crazyhouse without any special-casing.

---

## Files

| File | Responsibility |
|---|---|
| `src/engine/ai/evaluate.ts` | Static evaluation of a position |
| `src/engine/ai/search.ts` | Alpha-beta minimax search |
| `src/ai/aiWorker.ts` | Web Worker entry point |
| `src/ai/botClient.ts` | Main-thread client for the worker |
| `src/components/AIController.tsx` | Headless React component that drives the AI |

---

## Static evaluation (`evaluate.ts`)

`evaluate(state: GameState): number`

Returns a score from White's perspective (positive = White is better). White maximises, Black minimises.

**Components:**

| Term | How it's scored |
|---|---|
| Material | Standard piece values: P=100, N=320, B=330, R=500, Q=900, K=0 (king loss is a terminal result, not a material term) |
| Centrality | +2 per centrality unit for knights, bishops, queens (rewards development toward the centre) |
| Pawn advance | +4 per rank advanced toward promotion; +1 per centrality unit |
| Pocket material (Crazyhouse) | Pocket pieces counted at face value for each side |

The king has no material value because losing it triggers a `GameResult` scored by `terminalScore()` in the search, not by `evaluate()`.

---

## Alpha-beta search (`search.ts`)

`searchBestMove(state, variant, depth): { move, score }`

Standard minimax with alpha-beta pruning. Key properties:

- **White maximises, Black minimises.** The branching is driven by `state.sideToMove`, so two consecutive Black nodes (Monster King's two-move turn) are both minimising nodes — multi-move turns are handled for free.
- **Move ordering.** Captures and promotions are searched first (ordered by `10 × captured_value + promotion_value`). This dramatically improves pruning efficiency.
- **Terminal scoring.** A win/loss is scored as `±(MATE - ply)` where `MATE = 1,000,000`. The `ply` offset makes the engine prefer faster wins and slower losses.
- **Depth.** `depth` is the number of plies to search. Difficulty levels map to depths: Easy = 2, Medium = 3, Hard = 4.

### Why this works for Monster King

In Monster King, Black gets two plies per turn. `state.sideToMove` remains `"b"` for both plies; both are minimising nodes in the tree. No special handling is needed.

### Limitations

- No transposition table — the same position can be evaluated multiple times.
- No iterative deepening — the engine searches to the exact requested depth every time.
- No quiescence search — evaluation at leaf nodes can be affected by hanging captures.
- Stockfish WASM can be added later behind the same worker boundary for stronger standard-chess play.

---

## Web Worker (`aiWorker.ts`)

```typescript
// Receives: { id, state, variantId, depth }
// Posts back: { id, move }
self.onmessage = (e) => {
  const { id, state, variantId, depth } = e.data;
  const variant = getVariant(variantId);
  const { move } = searchBestMove(state, variant, depth);
  self.postMessage({ id, move });
};
```

The worker is instantiated lazily by `botClient.ts`. It runs in a separate thread so the search (which can take hundreds of milliseconds at higher depths) does not block the UI.

---

## Main-thread client (`botClient.ts`)

`requestBestMove(state, variantId, depth): Promise<Move | null>`

Maintains a single worker instance and a `Map` of pending promise resolvers keyed by a sequence number. Handles only one request at a time (a new request while one is in flight is still sent, but since the UI shows "thinking" and blocks input, concurrent requests do not occur in practice).

---

## AIController component (`AIController.tsx`)

A headless React component (renders `null`) that watches the game state and fires the worker when it is a computer-controlled side's turn.

**Logic:**

1. On each state change, checks whether `state.sideToMove` is a computer-controlled side (`aiWhite` or `aiBlack` from preferences).
2. If yes: sets `thinking = true`, calls `requestBestMove`, and stores a *token* (a counter value) for the current request.
3. When the promise resolves, checks the token is still current (protects against React Strict Mode's double-invoke and preference changes mid-search). If valid: calls `commitMove` and clears `thinking`.
4. On cleanup (effect teardown): increments the token to invalidate any in-flight request.

**Dependencies:** `state`, `variant.id`, `aiWhite`, `aiBlack`, `aiDepth`, `result`.

---

## Difficulty levels

| Label | Search depth | Approximate positions evaluated |
|---|---|---|
| Easy | 2 plies | ~hundreds |
| Medium | 3 plies | ~thousands |
| Hard | 4 plies | ~tens of thousands |

Depth is configured in the Settings panel and saved in user preferences.

---

## Adding a stronger engine later

Replace the worker call in `botClient.ts` with Stockfish WASM (e.g., `stockfish.wasm` from the `stockfish.js` package). The interface is the same: the caller sends a position, the worker returns a move. Nothing in `AIController.tsx` or `gameStore.ts` needs to change.

For variant-specific rules (Monster King, Crazyhouse), the custom alpha-beta will remain the correct engine since Stockfish only understands standard chess and Crazyhouse.
