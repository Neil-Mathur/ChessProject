# Component: AI Opponent

**Location:** `src/engine/ai/`, `src/ai/`

The AI runs in a browser Web Worker so the UI remains responsive while the computer thinks. Two engines are used:

- **Standard Chess** → **Stockfish 18 (WASM)** — a real chess engine, much stronger play.
- **All other variants** (Monster King, Crazyhouse) → the built-in **alpha-beta** engine, which is variant-agnostic: it searches through whatever `legalMoves` and `applyMove` the active variant provides, so it needs no special-casing per variant.

`AIController.tsx` picks the engine based on `variant.id`.

---

## Files

| File | Responsibility |
|---|---|
| `src/engine/ai/evaluate.ts` | Static evaluation of a position (built-in engine) |
| `src/engine/ai/search.ts` | Alpha-beta minimax search (built-in engine) |
| `src/ai/aiWorker.ts` | Web Worker entry point (built-in engine) |
| `src/ai/botClient.ts` | Main-thread client for the built-in engine worker |
| `src/ai/stockfishClient.ts` | Main-thread UCI client for the Stockfish worker |
| `public/stockfish.js` + `public/stockfish.wasm` | Stockfish 18 lite single-threaded WASM build (static assets) |
| `src/components/AIController.tsx` | Headless React component that drives the AI and routes to the right engine |

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
- **Depth.** `depth` is the number of plies to search. Difficulty levels map to depths: Easy = 2, Medium = 3, Hard = 4. (For Standard Chess the same setting maps to Stockfish depths instead — see below.)

### Why this works for Monster King

In Monster King, Black gets two plies per turn. `state.sideToMove` remains `"b"` for both plies; both are minimising nodes in the tree. No special handling is needed.

### Limitations

- No transposition table — the same position can be evaluated multiple times.
- No iterative deepening — the engine searches to the exact requested depth every time.
- No quiescence search — evaluation at leaf nodes can be affected by hanging captures.

These limitations only affect the variant engine. Standard Chess uses Stockfish (below).

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

## Stockfish for Standard Chess (`stockfishClient.ts`)

Standard Chess games use **Stockfish 18** (the lite single-threaded WASM build from the `stockfish` npm package) instead of the built-in engine.

### How it's served

The two engine files are copied into `/public` and served as static assets:

- `public/stockfish.js` (~21 KB) — the engine's JS loader/glue
- `public/stockfish.wasm` (~7 MB) — the compiled engine

The build runs as a **self-contained Web Worker** when instantiated with the URL hash `#,worker`:

```typescript
new Worker("/stockfish.js#,worker");
```

It then loads `stockfish.wasm` from the same base path automatically. The single-threaded build was chosen deliberately: the multi-threaded build needs `SharedArrayBuffer`, which requires cross-origin-isolation headers (`COOP`/`COEP`) on the server. The single-threaded build has no such requirement. The WASM is only fetched when a Standard Chess AI game actually starts (the worker is created lazily).

### UCI protocol flow

`requestStockfishMove(fen: string, aiDepth: number): Promise<string | null>`

1. **Init (once):** send `uci`, then `isready`; wait for `readyok`.
2. **Per search:** send `ucinewgame`, `position fen <fen>`, `go depth <n>`; wait for `bestmove e2e4`-style output.
3. Returns the UCI move string (`"e2e4"`, `"e7e8q"` for promotions) or `null` for `bestmove (none)`.
4. A new request while one is in flight sends `stop` and resolves the stale request with `null`.

### FEN requirements — `toFullFen()`

Stockfish needs a *complete* FEN. The renderer's `toFen()` in `src/engine/board.ts` hardcodes `- -` for castling and en-passant (fine for drawing the board, wrong for engine analysis). `toFullFen()` encodes the real castling rights (`KQkq`) and en-passant square from `GameState`, so Stockfish sees the true position.

---

## AIController component (`AIController.tsx`)

A headless React component (renders `null`) that watches the game state and fires the appropriate engine when it is a computer-controlled side's turn.

**Logic:**

1. On each state change, checks whether `state.sideToMove` is a computer-controlled side (`aiWhite` or `aiBlack` from preferences).
2. If yes: sets `thinking = true`, stores a *token* (a counter value) for the current request, then routes by variant:
   - `variant.id === "standard"` → `requestStockfishMove(toFullFen(state), aiDepth)`; the returned UCI string is split into `from`/`to`/`promotion` and applied via `tryMove()`.
   - any other variant → `requestBestMove(state, variant.id, aiDepth)`; the returned `Move` object is applied via `commitMove()`.
3. When the promise resolves, checks the token is still current (protects against React Strict Mode's double-invoke and preference changes mid-search) before applying the move and clearing `thinking`.
4. On cleanup (effect teardown): increments the token to invalidate any in-flight request.

**Dependencies:** `state`, `variant.id`, `aiWhite`, `aiBlack`, `aiDepth`, `result`.

---

## Difficulty levels

The same Easy/Medium/Hard setting (stored as `aiDepth` = 2/3/4 in preferences) maps differently per engine:

| Label | Built-in engine (variants) | Stockfish (Standard) |
|---|---|---|
| Easy | 2 plies | depth 5 |
| Medium | 3 plies | depth 10 |
| Hard | 4 plies | depth 15 |

Difficulty is configured in the Opponents panel and saved in user preferences. Note that even "Easy" Stockfish (depth 5) is considerably stronger than the built-in engine at any depth.
