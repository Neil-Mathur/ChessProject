// Crazyhouse: standard chess, but a captured piece switches sides and may be
// dropped back onto an empty square as the capturer's own piece. A promoted
// pawn reverts to a pawn when captured. Win by checkmate.
import { placePieces } from "../board";
import {
  applyToBoard,
  filterLegal,
  inCheck,
  opposite,
  pseudoLegalDrops,
  pseudoLegalMoves,
} from "../moveGen";
import { GameResult, GameState, Move, Pockets } from "../types";
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

const clonePockets = (p: Pockets): Pockets => ({ w: [...p.w], b: [...p.b] });

const movesPerTurn = (): number => 1;

function legalMoves(state: GameState): Move[] {
  const color = state.sideToMove;
  const moves = [
    ...pseudoLegalMoves(state, color),
    ...pseudoLegalDrops(state, color),
  ];
  return filterLegal(state, moves, color);
}

function applyMove(state: GameState, move: Move): GameState {
  const { board, castling, enPassant } = applyToBoard(state, move);
  const pockets = clonePockets(state.pockets ?? { w: [], b: [] });
  const mover = state.sideToMove;

  // A drop spends a piece from the mover's pocket.
  if (move.drop) {
    const hand = pockets[mover];
    const idx = hand.indexOf(move.drop);
    if (idx >= 0) hand.splice(idx, 1);
  }
  // A capture adds the captured piece to the mover's pocket (promoted -> pawn).
  if (move.captured) {
    pockets[mover].push(move.captured.promoted ? "p" : move.captured.type);
  }

  return {
    board,
    sideToMove: opposite(mover),
    movesRemaining: 1,
    castling,
    enPassant,
    pockets,
    variantId: state.variantId,
  };
}

function result(state: GameState): GameResult | null {
  if (legalMoves(state).length > 0) return null;
  const color = state.sideToMove;
  if (inCheck(state, color)) {
    return { outcome: color === "w" ? "black" : "white", reason: "Checkmate" };
  }
  return { outcome: "draw", reason: "Stalemate" };
}

export const crazyhouseVariant: Variant = {
  id: "crazyhouse",
  name: "Crazyhouse",
  description:
    "Standard chess, but captured pieces switch sides and can be dropped back " +
    "onto the board. Win by checkmate.",
  setup: (): GameState => ({
    board: placePieces(startPosition()),
    sideToMove: "w",
    movesRemaining: 1,
    castling: { wk: true, wq: true, bk: true, bq: true },
    enPassant: null,
    pockets: { w: [], b: [] },
    variantId: "crazyhouse",
  }),
  movesPerTurn,
  legalMoves,
  applyMove,
  result,
};
