// Standard chess: 1 move per turn, full legality (no self-check),
// win by checkmate, draw by stalemate.
import { placePieces } from "../board";
import {
  applyMove as applyMoveCore,
  filterLegal,
  inCheck,
  pseudoLegalMoves,
} from "../moveGen";
import { GameResult, GameState, Move } from "../types";
import { Variant } from "../variant";

const BACK_RANK = ["r", "n", "b", "q", "k", "b", "n", "r"];
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function startPosition(): Record<string, string> {
  const map: Record<string, string> = {};
  FILES.forEach((file, i) => {
    map[`${file}1`] = `w${BACK_RANK[i].toUpperCase()}`;
    map[`${file}2`] = "wP";
    map[`${file}7`] = "bP";
    map[`${file}8`] = `b${BACK_RANK[i].toUpperCase()}`;
  });
  return map;
}

const movesPerTurn = (): number => 1;

function legalMoves(state: GameState): Move[] {
  const color = state.sideToMove;
  return filterLegal(state, pseudoLegalMoves(state, color), color);
}

function result(state: GameState): GameResult | null {
  if (legalMoves(state).length > 0) return null;
  const color = state.sideToMove;
  if (inCheck(state, color)) {
    return {
      outcome: color === "w" ? "black" : "white",
      reason: "Checkmate",
    };
  }
  return { outcome: "draw", reason: "Stalemate" };
}

export const standardVariant: Variant = {
  id: "standard",
  name: "Standard Chess",
  description: "Classic chess. White and black each move once per turn.",
  setup: (): GameState => ({
    board: placePieces(startPosition()),
    sideToMove: "w",
    movesRemaining: 1,
    castling: { wk: true, wq: true, bk: true, bq: true },
    enPassant: null,
    variantId: "standard",
  }),
  movesPerTurn,
  legalMoves,
  applyMove: (state, move) => applyMoveCore(state, move, movesPerTurn),
  result,
};
