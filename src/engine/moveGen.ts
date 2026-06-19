// Shared move-generation core used by every variant.
// Produces PSEUDO-LEGAL moves (does not consider leaving one's own king in
// check). Variants decide what "legal" means on top of this.
import {
  cloneBoard,
  fileOf,
  findKing,
  onBoard,
  rankOf,
  squareIndex,
} from "./board";
import {
  CastlingRights,
  Color,
  GameState,
  Move,
  Piece,
  PieceType,
  Square,
} from "./types";

const opposite = (c: Color): Color => (c === "w" ? "b" : "w");

const KNIGHT_DELTAS: [number, number][] = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS: [number, number][] = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const BISHOP_DELTAS: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DELTAS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const PROMO_TYPES: PieceType[] = ["q", "r", "b", "n"];

/** Is `sq` attacked by any piece of color `by`? (Ignores en passant / castling.) */
export function isAttacked(
  board: (Piece | null)[],
  sq: Square,
  by: Color
): boolean {
  const f = fileOf(sq);
  const r = rankOf(sq);

  // Pawn attacks: a pawn of color `by` sits one rank "behind" its push direction.
  const pawnRank = by === "w" ? r - 1 : r + 1;
  for (const df of [-1, 1]) {
    if (onBoard(f + df, pawnRank)) {
      const p = board[squareIndex(f + df, pawnRank)];
      if (p && p.color === by && p.type === "p") return true;
    }
  }

  // Knights.
  for (const [df, dr] of KNIGHT_DELTAS) {
    if (onBoard(f + df, r + dr)) {
      const p = board[squareIndex(f + df, r + dr)];
      if (p && p.color === by && p.type === "n") return true;
    }
  }

  // King.
  for (const [df, dr] of KING_DELTAS) {
    if (onBoard(f + df, r + dr)) {
      const p = board[squareIndex(f + df, r + dr)];
      if (p && p.color === by && p.type === "k") return true;
    }
  }

  // Sliding pieces.
  const scan = (deltas: [number, number][], types: PieceType[]) => {
    for (const [df, dr] of deltas) {
      let nf = f + df;
      let nr = r + dr;
      while (onBoard(nf, nr)) {
        const p = board[squareIndex(nf, nr)];
        if (p) {
          if (p.color === by && types.includes(p.type)) return true;
          break;
        }
        nf += df;
        nr += dr;
      }
    }
    return false;
  };
  if (scan(BISHOP_DELTAS, ["b", "q"])) return true;
  if (scan(ROOK_DELTAS, ["r", "q"])) return true;

  return false;
}

function addJumpMoves(
  board: (Piece | null)[],
  from: Square,
  color: Color,
  deltas: [number, number][],
  out: Move[]
) {
  const f = fileOf(from);
  const r = rankOf(from);
  for (const [df, dr] of deltas) {
    if (!onBoard(f + df, r + dr)) continue;
    const to = squareIndex(f + df, r + dr);
    const target = board[to];
    if (!target || target.color !== color) {
      out.push({ from, to, captured: target ?? null });
    }
  }
}

function addSlidingMoves(
  board: (Piece | null)[],
  from: Square,
  color: Color,
  deltas: [number, number][],
  out: Move[]
) {
  const f = fileOf(from);
  const r = rankOf(from);
  for (const [df, dr] of deltas) {
    let nf = f + df;
    let nr = r + dr;
    while (onBoard(nf, nr)) {
      const to = squareIndex(nf, nr);
      const target = board[to];
      if (!target) {
        out.push({ from, to, captured: null });
      } else {
        if (target.color !== color) out.push({ from, to, captured: target });
        break;
      }
      nf += df;
      nr += dr;
    }
  }
}

function addPawnMoves(state: GameState, from: Square, color: Color, out: Move[]) {
  const board = state.board;
  const f = fileOf(from);
  const r = rankOf(from);
  const dir = color === "w" ? 1 : -1;
  const startRank = color === "w" ? 1 : 6;
  const promoRank = color === "w" ? 7 : 0;

  const pushMaybePromote = (to: Square, captured: Piece | null) => {
    if (rankOf(to) === promoRank) {
      for (const promotion of PROMO_TYPES) out.push({ from, to, captured, promotion });
    } else {
      out.push({ from, to, captured });
    }
  };

  // Single & double forward push.
  if (onBoard(f, r + dir) && !board[squareIndex(f, r + dir)]) {
    pushMaybePromote(squareIndex(f, r + dir), null);
    if (r === startRank && !board[squareIndex(f, r + 2 * dir)]) {
      out.push({ from, to: squareIndex(f, r + 2 * dir), captured: null });
    }
  }

  // Diagonal captures (including en passant).
  for (const df of [-1, 1]) {
    if (!onBoard(f + df, r + dir)) continue;
    const to = squareIndex(f + df, r + dir);
    const target = board[to];
    if (target && target.color !== color) {
      pushMaybePromote(to, target);
    } else if (!target && to === state.enPassant) {
      const capturedSq = squareIndex(f + df, r);
      out.push({ from, to, captured: board[capturedSq], enPassant: true });
    }
  }
}

function addCastlingMoves(state: GameState, color: Color, out: Move[]) {
  const board = state.board;
  const rights = state.castling;
  const rank = color === "w" ? 0 : 7;
  const kingFrom = squareIndex(4, rank);
  if (!board[kingFrom] || board[kingFrom]!.type !== "k") return;

  const kSide = color === "w" ? rights.wk : rights.bk;
  const qSide = color === "w" ? rights.wq : rights.bq;

  // King-side: f & g empty, rook on h.
  if (kSide) {
    const rook = board[squareIndex(7, rank)];
    if (
      rook &&
      rook.type === "r" &&
      rook.color === color &&
      !board[squareIndex(5, rank)] &&
      !board[squareIndex(6, rank)]
    ) {
      out.push({ from: kingFrom, to: squareIndex(6, rank), castle: "k" });
    }
  }
  // Queen-side: b, c, d empty, rook on a.
  if (qSide) {
    const rook = board[squareIndex(0, rank)];
    if (
      rook &&
      rook.type === "r" &&
      rook.color === color &&
      !board[squareIndex(1, rank)] &&
      !board[squareIndex(2, rank)] &&
      !board[squareIndex(3, rank)]
    ) {
      out.push({ from: kingFrom, to: squareIndex(2, rank), castle: "q" });
    }
  }
}

/** All pseudo-legal moves for `color` (no self-check filtering). */
export function pseudoLegalMoves(state: GameState, color: Color): Move[] {
  const out: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece || piece.color !== color) continue;
    switch (piece.type) {
      case "p":
        addPawnMoves(state, sq, color, out);
        break;
      case "n":
        addJumpMoves(state.board, sq, color, KNIGHT_DELTAS, out);
        break;
      case "k":
        addJumpMoves(state.board, sq, color, KING_DELTAS, out);
        break;
      case "b":
        addSlidingMoves(state.board, sq, color, BISHOP_DELTAS, out);
        break;
      case "r":
        addSlidingMoves(state.board, sq, color, ROOK_DELTAS, out);
        break;
      case "q":
        addSlidingMoves(state.board, sq, color, [...BISHOP_DELTAS, ...ROOK_DELTAS], out);
        break;
    }
  }
  addCastlingMoves(state, color, out);
  return out;
}

function updateCastlingRights(
  rights: CastlingRights,
  move: Move,
  piece: Piece
): CastlingRights {
  const next = { ...rights };
  // Moving king clears both rights for that color.
  if (piece.type === "k") {
    if (piece.color === "w") {
      next.wk = false;
      next.wq = false;
    } else {
      next.bk = false;
      next.bq = false;
    }
  }
  // Moving or capturing a rook on a home square clears the relevant right.
  const clearForSquare = (sq: Square) => {
    if (sq === squareIndex(0, 0)) next.wq = false;
    if (sq === squareIndex(7, 0)) next.wk = false;
    if (sq === squareIndex(0, 7)) next.bq = false;
    if (sq === squareIndex(7, 7)) next.bk = false;
  };
  clearForSquare(move.from);
  clearForSquare(move.to);
  return next;
}

/**
 * Apply a move to the board only (board + castling + en-passant), without
 * touching whose turn it is. Shared by legality checks and full move application.
 */
export function applyToBoard(state: GameState, move: Move) {
  const board = cloneBoard(state.board);

  // Crazyhouse drop: place a fresh (non-promoted) piece from the pocket.
  if (move.drop) {
    board[move.to] = { color: state.sideToMove, type: move.drop };
    return { board, castling: state.castling, enPassant: null as Square | null };
  }

  const piece = board[move.from]!;

  // En-passant: remove the captured pawn that sits beside the moving pawn.
  if (move.enPassant) {
    const capturedSq = squareIndex(fileOf(move.to), rankOf(move.from));
    board[capturedSq] = null;
  }

  // Move the piece (apply promotion if any). A promoted piece is flagged so
  // Crazyhouse can revert it to a pawn when captured.
  board[move.to] = move.promotion
    ? { color: piece.color, type: move.promotion, promoted: true }
    : piece;
  board[move.from] = null;

  // Castling: relocate the rook.
  if (move.castle) {
    const rank = rankOf(move.from);
    if (move.castle === "k") {
      board[squareIndex(5, rank)] = board[squareIndex(7, rank)];
      board[squareIndex(7, rank)] = null;
    } else {
      board[squareIndex(3, rank)] = board[squareIndex(0, rank)];
      board[squareIndex(0, rank)] = null;
    }
  }

  const castling = updateCastlingRights(state.castling, move, piece);

  // En-passant target: set only on a two-square pawn push.
  let enPassant: Square | null = null;
  if (piece.type === "p" && Math.abs(rankOf(move.to) - rankOf(move.from)) === 2) {
    enPassant = squareIndex(fileOf(move.from), (rankOf(move.from) + rankOf(move.to)) / 2);
  }

  return { board, castling, enPassant };
}

/**
 * Full move application including the multi-move turn budget.
 * `movesPerTurn(color)` returns how many plies that color gets per turn.
 */
export function applyMove(
  state: GameState,
  move: Move,
  movesPerTurn: (color: Color) => number
): GameState {
  const { board, castling, enPassant } = applyToBoard(state, move);

  const remaining = state.movesRemaining - 1;
  let sideToMove = state.sideToMove;
  let movesRemaining: number;
  if (remaining <= 0) {
    sideToMove = opposite(state.sideToMove);
    movesRemaining = movesPerTurn(sideToMove);
  } else {
    movesRemaining = remaining;
  }

  return {
    board,
    sideToMove,
    movesRemaining,
    castling,
    enPassant,
    variantId: state.variantId,
  };
}

/** Does applying `move` leave `color`'s own king in check? (Standard-chess legality.) */
export function leavesKingInCheck(
  state: GameState,
  move: Move,
  color: Color
): boolean {
  const { board } = applyToBoard(state, move);
  const kingSq = findKing(board, color);
  if (kingSq === -1) return true; // king captured = illegal in standard chess
  return isAttacked(board, kingSq, opposite(color));
}

/** Is `color`'s king currently under attack? */
export function inCheck(state: GameState, color: Color): boolean {
  const kingSq = findKing(state.board, color);
  return kingSq !== -1 && isAttacked(state.board, kingSq, opposite(color));
}

/**
 * Filter pseudo-legal moves down to fully legal ones under standard-chess rules:
 * a move may not leave one's own king in check, and castling may not pass out
 * of / through / into check. Shared by Standard and Crazyhouse.
 */
export function filterLegal(state: GameState, moves: Move[], color: Color): Move[] {
  return moves.filter((move) => {
    if (move.castle) {
      if (inCheck(state, color)) return false;
      const rank = move.from - (move.from % 8);
      const mid = move.castle === "k" ? rank + 5 : rank + 3;
      if (isAttacked(state.board, mid, opposite(color))) return false;
    }
    return !leavesKingInCheck(state, move, color);
  });
}

/**
 * Crazyhouse drop moves: each distinct pocket piece type onto every empty
 * square (pawns may not be dropped on the first or last rank).
 */
export function pseudoLegalDrops(state: GameState, color: Color): Move[] {
  const pocket = state.pockets?.[color];
  if (!pocket || pocket.length === 0) return [];
  const out: Move[] = [];
  const types = Array.from(new Set(pocket));
  for (const type of types) {
    for (let sq = 0; sq < 64; sq++) {
      if (state.board[sq]) continue;
      if (type === "p") {
        const r = rankOf(sq);
        if (r === 0 || r === 7) continue;
      }
      out.push({ from: -1, to: sq, drop: type });
    }
  }
  return out;
}

export { opposite };
