// Alpha-beta search over the variant's own move generation and turn budget.
//
// Evaluation is always from White's perspective: White maximizes, Black
// minimizes. Because `state.sideToMove` drives min/max (not a fixed alternation),
// a side that moves twice per turn simply produces two consecutive nodes of the
// same kind — so the multi-move turn structure is handled for free.
import { Variant } from "../variant";
import { GameState, Move, PieceType } from "../types";
import { evaluate, VALUE } from "./evaluate";

const MATE = 1_000_000;

/** Captures and promotions first — cheap move ordering to help alpha-beta. */
function orderMoves(moves: Move[]): Move[] {
  const score = (m: Move): number => {
    let s = 0;
    if (m.captured) s += 10 * VALUE[m.captured.type];
    if (m.promotion) s += VALUE[m.promotion as PieceType];
    return s;
  };
  return [...moves].sort((a, b) => score(b) - score(a));
}

function terminalScore(outcome: "white" | "black" | "draw", ply: number): number {
  if (outcome === "draw") return 0;
  // Prefer faster wins / slower losses by folding in distance from the root.
  const sign = outcome === "white" ? 1 : -1;
  return sign * (MATE - ply);
}

function minimax(
  state: GameState,
  variant: Variant,
  depth: number,
  alpha: number,
  beta: number,
  ply: number
): number {
  const res = variant.result(state);
  if (res) return terminalScore(res.outcome, ply);
  if (depth === 0) return evaluate(state);

  const moves = orderMoves(variant.legalMoves(state));
  if (moves.length === 0) return evaluate(state);

  if (state.sideToMove === "w") {
    let best = -Infinity;
    for (const m of moves) {
      const v = minimax(variant.applyMove(state, m), variant, depth - 1, alpha, beta, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const v = minimax(variant.applyMove(state, m), variant, depth - 1, alpha, beta, ply + 1);
      if (v < best) best = v;
      if (v < beta) beta = v;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export interface SearchResult {
  move: Move | null;
  score: number;
}

/** Pick the best move for the side to move, searching `depth` plies. */
export function searchBestMove(state: GameState, variant: Variant, depth: number): SearchResult {
  const moves = orderMoves(variant.legalMoves(state));
  if (moves.length === 0) return { move: null, score: evaluate(state) };

  const maximizing = state.sideToMove === "w";
  let bestMove: Move = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const m of moves) {
    const v = minimax(variant.applyMove(state, m), variant, depth - 1, alpha, beta, 1);
    if (maximizing) {
      if (v > bestScore) {
        bestScore = v;
        bestMove = m;
      }
      if (v > alpha) alpha = v;
    } else {
      if (v < bestScore) {
        bestScore = v;
        bestMove = m;
      }
      if (v < beta) beta = v;
    }
  }
  return { move: bestMove, score: bestScore };
}
