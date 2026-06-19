# Component: Chess Engine

**Location:** `src/engine/`

The engine is pure TypeScript with no React, Next.js, or DOM dependencies. It can run in the browser, in a Web Worker, or on the Node.js server (for online multiplayer move validation) without modification.

---

## Files

| File | Responsibility |
|---|---|
| `types.ts` | All core TypeScript types |
| `board.ts` | Square math, FEN export, piece placement |
| `moveGen.ts` | Pseudo-legal move generation + shared utilities |
| `variant.ts` | The `Variant` interface |
| `variants/standard.ts` | Standard chess rules |
| `variants/monsterKing.ts` | Monster King Chess rules |
| `variants/crazyhouse.ts` | Crazyhouse rules |
| `variants/index.ts` | Variant registry + `getVariant()` |
| `ai/evaluate.ts` | Static evaluation function |
| `ai/search.ts` | Alpha-beta minimax |
| `selftest.ts` | 25-assertion self-test (`npm run test:engine`) |

---

## Core types (`types.ts`)

```
Color         "w" | "b"
PieceType     "p" | "n" | "b" | "r" | "q" | "k"
Square        number  (0 = a1, 7 = h1, 56 = a8, 63 = h8)
              index = rank * 8 + file
              rank 0 = White's back rank (rank 1 on the board)
              file 0 = a-file

Piece         { color, type, promoted? }
              promoted is true for Crazyhouse promoted pawns —
              they revert to a pawn when captured.

Move          { from, to, promotion?, captured?, enPassant?,
                castle?, drop? }
              from = DROP_FROM (-1) for Crazyhouse drop moves.
              drop = the piece type being dropped from the pocket.

Pockets       { w: PieceType[], b: PieceType[] }
              Crazyhouse only. Each entry is one piece in hand.

GameState     { board, sideToMove, movesRemaining, castling,
                enPassant, pockets?, variantId }
              board is a 64-element array, index = Square.
              movesRemaining drives the multi-move turn budget.

GameResult    { outcome: "white"|"black"|"draw", reason: string }
```

---

## Board utilities (`board.ts`)

```typescript
rankOf(sq: Square): number     // 0..7
fileOf(sq: Square): number     // 0..7
parseSquare(name: string): Square   // "e4" → 28
squareName(sq: Square): string      // 28 → "e4"
findKing(board, color): Square      // -1 if the king is gone
placePieces(map): board             // {"e1": "wK", ...} → 64-element array
toFen(state): string                // FEN position string for react-chessboard
```

---

## Move generation (`moveGen.ts`)

### `pseudoLegalMoves(state, color): Move[]`

Generates all moves that are geometrically valid for `color` without checking whether they leave the king in check. Covers:

- Pawn single/double push, diagonal capture, en passant
- Knight, bishop, rook, queen sliding and jump moves
- Castling (king-side and queen-side, rights permitting)
- Captures (records `captured` piece on the move)

### `pseudoLegalDrops(state, color): Move[]`

Generates all legal drop destinations for every piece type in `color`'s pocket. Rules:

- Target square must be empty
- Pawns cannot be dropped on ranks 1 or 8 (the back ranks)
- Returns one `Move` per (piece type, target square) combination

### `applyToBoard(state, move)`

Applies a single move to the board array. Handles drops (early return with piece placement), captures, en passant removal, castling rook move, and promotion with the `promoted` flag.

### `applyMove(state, move, movesPerTurn): GameState`

Wraps `applyToBoard`. Decrements `movesRemaining`; when it hits 0, flips `sideToMove` and resets the budget via `movesPerTurn`. Tracks `enPassant` for the next ply.

### `inCheck(state, color): boolean`

Returns `true` if `color`'s king is attacked by any opponent pseudo-legal move.

### `filterLegal(state, moves, color): Move[]`

Filters a move list to those that do not leave `color`'s king in check. Used by Standard and Crazyhouse `legalMoves()`.

---

## The Variant interface (`variant.ts`)

```typescript
interface Variant {
  id: string;
  name: string;
  description: string;
  setup(): GameState;
  movesPerTurn(color: Color): number;
  legalMoves(state: GameState): Move[];
  applyMove(state: GameState, move: Move): GameState;
  result(state: GameState): GameResult | null;
}
```

Every rule set implements this interface. Nothing in the UI hard-codes variant rules — the board, AI, and online server all operate through this interface.

---

## Variants

### Standard Chess (`variants/standard.ts`)

- `movesPerTurn`: always 1 for both colours
- `legalMoves`: `pseudoLegalMoves` filtered through `filterLegal` (no self-check)
- `result`: no legal moves → checkmate (if in check) or stalemate (if not)

### Monster King Chess (`variants/monsterKing.ts`)

Black starts with only a king on e8 and three pawns on d7/e7/f7. White has a full standard army. There is no check concept.

- `movesPerTurn`: White = 1, Black = 2
- `legalMoves`: all `pseudoLegalMoves` (no filter — any move is legal including "walking into check")
- `result`: game ends only when a king is actually captured (`findKing` returns -1)

### Crazyhouse (`variants/crazyhouse.ts`)

Standard starting position. Captured pieces join the capturing player's *pocket* and can later be *dropped* onto any empty square as a move (pawns cannot be dropped on the back rank). Promoted pawns that are later captured revert to pawns in the pocket (`Piece.promoted` flag).

- `movesPerTurn`: always 1
- `legalMoves`: `pseudoLegalMoves` + `pseudoLegalDrops`, both filtered through `filterLegal`
- `applyMove`: extends standard apply with pocket bookkeeping
  - On drop: removes the piece from pocket, places it on the board
  - On capture: adds the captured piece to the mover's pocket; if the piece was promoted (`Piece.promoted = true`), it is added as a pawn regardless of its current type

### Variant registry (`variants/index.ts`)

```typescript
export const VARIANTS: Variant[] = [standardVariant, monsterKingVariant, crazyhouseVariant];
export const DEFAULT_VARIANT_ID = "monster-king";

export function getVariant(id: string): Variant {
  // returns the matching variant, throws if not found
}
```

---

## Adding a new variant

1. Create `src/engine/variants/yourVariant.ts` and implement the `Variant` interface.
2. Add it to the array in `src/engine/variants/index.ts`.

It immediately appears in the variant selector and works with all board skins, the AI opponent, and online multiplayer. No UI changes required.

---

## Self-test

```bash
npm run test:engine
```

Runs `src/engine/selftest.ts` via `tsx`. Tests are pure assertions (no test framework). Currently 25 assertions covering:

- Standard: opening move count, turn order
- Monster King: setup, move budget, capture-the-king win condition, AI king-capture
- AI: free-rook capture in standard
- Crazyhouse: empty pockets at start, opening move count, capture → pocket, drop mechanics, pawn rank restriction, promoted-piece reversion

Exit code 0 = all pass. Run this after any change to the engine.
