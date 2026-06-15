// Monster King Chess (custom variant).
//   - White: standard army.
//   - Black: king + d/e/f pawns only, but TWO moves per turn.
//   - No check / checkmate. The game is won by CAPTURING the enemy king.
import { findKing, placePieces } from "../board";
import { applyMove as applyMoveCore, pseudoLegalMoves } from "../moveGen";
import { Color, GameResult, GameState, Move } from "../types";
import { Variant } from "../variant";

const BACK_RANK = ["r", "n", "b", "q", "k", "b", "n", "r"];
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function startPosition(): Record<string, string> {
  const map: Record<string, string> = {};
  // White: full standard army.
  FILES.forEach((file, i) => {
    map[`${file}1`] = `w${BACK_RANK[i].toUpperCase()}`;
    map[`${file}2`] = "wP";
  });
  // Black: king + d/e/f pawns only.
  map["e8"] = "bK";
  map["d7"] = "bP";
  map["e7"] = "bP";
  map["f7"] = "bP";
  return map;
}

const movesPerTurn = (color: Color): number => (color === "b" ? 2 : 1);

// No check concept: every pseudo-legal move is legal (including capturing the
// enemy king, which is how you win, and including "self-exposing" king moves).
function legalMoves(state: GameState): Move[] {
  return pseudoLegalMoves(state, state.sideToMove);
}

function result(state: GameState): GameResult | null {
  if (findKing(state.board, "w") === -1) {
    return { outcome: "black", reason: "White king captured" };
  }
  if (findKing(state.board, "b") === -1) {
    return { outcome: "white", reason: "Black king captured" };
  }
  if (legalMoves(state).length === 0) {
    return { outcome: "draw", reason: "No legal moves" };
  }
  return null;
}

export const monsterKingVariant: Variant = {
  id: "monster-king",
  name: "Monster King Chess",
  description:
    "Black has only a king and the d/e/f pawns, but moves twice per turn. " +
    "No check — capture the enemy king to win.",
  setup: (): GameState => ({
    board: placePieces(startPosition()),
    sideToMove: "w",
    movesRemaining: 1,
    // Only White has rooks; Black cannot castle.
    castling: { wk: true, wq: true, bk: false, bq: false },
    enPassant: null,
    variantId: "monster-king",
  }),
  movesPerTurn,
  legalMoves,
  applyMove: (state, move) => applyMoveCore(state, move, movesPerTurn),
  result,
};
