// The pluggable variant abstraction. Adding a new variant = implementing this
// interface and registering it. Nothing in the UI hard-codes variant rules.
import { Color, GameResult, GameState, Move } from "./types";

export interface Variant {
  id: string;
  name: string;
  description: string;
  /** Build the starting position. */
  setup(): GameState;
  /** How many plies this color gets per turn (e.g. Monster King: black = 2). */
  movesPerTurn(color: Color): number;
  /** Fully legal moves for the side to move, per this variant's rules. */
  legalMoves(state: GameState): Move[];
  /** Apply a legal move, returning the next state (handles turn budget). */
  applyMove(state: GameState, move: Move): GameState;
  /** Game result if the game is over, else null. */
  result(state: GameState): GameResult | null;
}
