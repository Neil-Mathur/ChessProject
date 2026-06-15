// Core, framework-agnostic chess engine types.
// Square index convention: 0 = a1, 7 = h1, 56 = a8, 63 = h8.
// index = rank * 8 + file, where file 0 = 'a', rank 0 = rank 1 (White's back rank).

export type Color = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  color: Color;
  type: PieceType;
}

export type Square = number; // 0..63

export interface Move {
  from: Square;
  to: Square;
  /** Promotion target piece type (pawn reaching the last rank). */
  promotion?: PieceType;
  /** Piece captured by this move (for history / king-capture detection). */
  captured?: Piece | null;
  /** True when this is an en-passant capture. */
  enPassant?: boolean;
  /** "k" = king-side, "q" = queen-side, undefined = not a castle. */
  castle?: "k" | "q";
}

export interface CastlingRights {
  wk: boolean;
  wq: boolean;
  bk: boolean;
  bq: boolean;
}

export interface GameState {
  /** 64-length board, indexed by Square. null = empty. */
  board: (Piece | null)[];
  sideToMove: Color;
  /** Remaining plies (moves) in the current side's turn. */
  movesRemaining: number;
  castling: CastlingRights;
  /** En-passant target square (the square a pawn skipped), or null. */
  enPassant: Square | null;
  variantId: string;
}

export type GameOutcome = "white" | "black" | "draw";

export interface GameResult {
  outcome: GameOutcome;
  reason: string;
}
