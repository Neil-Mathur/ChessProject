// Static evaluation, always from White's perspective (positive = White better).
// Intentionally lightweight so the alpha-beta search stays fast.
import { fileOf, rankOf } from "../board";
import { GameState, PieceType } from "../types";

const VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  // The king carries no material weight: losing it is a terminal result, scored
  // by the search, not by material. In normal positions both kings cancel out.
  k: 0,
};

/** Distance-from-center bonus, peaks in the 4 central squares. */
function centrality(sq: number): number {
  const df = 3.5 - Math.abs(fileOf(sq) - 3.5);
  const dr = 3.5 - Math.abs(rankOf(sq) - 3.5);
  return df + dr; // 0..7
}

export function evaluate(state: GameState): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p) continue;
    const sign = p.color === "w" ? 1 : -1;
    score += sign * VALUE[p.type];

    // Light positional terms.
    if (p.type === "n" || p.type === "b" || p.type === "q") {
      score += sign * centrality(sq) * 2;
    } else if (p.type === "p") {
      // Reward pawn advancement toward promotion.
      const advance = p.color === "w" ? rankOf(sq) : 7 - rankOf(sq);
      score += sign * advance * 4;
      score += sign * centrality(sq);
    }
  }
  return score;
}

export { VALUE };
