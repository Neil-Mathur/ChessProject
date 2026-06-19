// Live game state (not persisted). Holds the active variant, the board state,
// an undo history, a move log, and the result.
import { create } from "zustand";
import {
  GameResult,
  GameState,
  Move,
  Piece,
  Variant,
  getVariant,
  parseSquare,
  squareName,
  fileOf,
} from "@/engine";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function describeMove(state: GameState, move: Move): string {
  if (move.drop) return `${move.drop.toUpperCase()}@${squareName(move.to)}`;
  if (move.castle === "k") return "O-O";
  if (move.castle === "q") return "O-O-O";
  const piece = state.board[move.from]!;
  const target = squareName(move.to);
  const capture = move.captured ? "x" : "";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  if (piece.type === "p") {
    const fromFile = capture ? `${FILES[fileOf(move.from)]}x` : "";
    return `${fromFile}${target}${promo}`;
  }
  return `${piece.type.toUpperCase()}${capture}${target}${promo}`;
}

interface GameStore {
  variant: Variant;
  state: GameState;
  history: GameState[];
  moves: Move[];
  moveLog: string[];
  result: GameResult | null;
  /** True while the AI worker is computing a move. */
  thinking: boolean;
  /** Bumped on new game / reset so the board can re-key if needed. */
  gameId: number;

  newGame: (variantId: string) => void;
  /** Attempt a move from->to (algebraic squares). Returns true if applied. */
  tryMove: (from: string, to: string, promotion?: string) => boolean;
  /** Apply an already-legal Move object (used by the AI). */
  commitMove: (move: Move) => void;
  setThinking: (v: boolean) => void;
  undo: () => void;
  legalTargets: (from: string) => string[];
  /** True if a move from->to would be a pawn promotion (needs a piece choice). */
  isPromotion: (from: string, to: string) => boolean;
  /** Crazyhouse: attempt to drop a pocket piece onto a square. */
  tryDrop: (pieceType: string, to: string) => boolean;
  /** Crazyhouse: squares where the given pocket piece may legally be dropped. */
  legalDropTargets: (pieceType: string) => string[];
}

function initFor(variantId: string) {
  const variant = getVariant(variantId);
  return { variant, state: variant.setup() };
}

const initial = initFor("monster-king");

export const useGameStore = create<GameStore>((set, get) => ({
  variant: initial.variant,
  state: initial.state,
  history: [],
  moves: [],
  moveLog: [],
  result: null,
  thinking: false,
  gameId: 0,

  newGame: (variantId) => {
    const { variant, state } = initFor(variantId);
    set((s) => ({
      variant,
      state,
      history: [],
      moves: [],
      moveLog: [],
      result: null,
      thinking: false,
      gameId: s.gameId + 1,
    }));
  },

  commitMove: (move) => {
    const { variant, state, result, moveLog, history, moves } = get();
    if (result) return;
    const notation = describeMove(state, move);
    const next = variant.applyMove(state, move);
    set({
      state: next,
      history: [...history, state],
      moves: [...moves, move],
      moveLog: [...moveLog, notation],
      result: variant.result(next),
    });
  },

  setThinking: (v) => set({ thinking: v }),

  tryMove: (from, to, promotion) => {
    const { variant, state, result } = get();
    if (result) return false;

    const fromSq = parseSquare(from);
    const toSq = parseSquare(to);
    const candidates = variant
      .legalMoves(state)
      .filter((m) => m.from === fromSq && m.to === toSq);
    if (candidates.length === 0) return false;

    // Pick the requested promotion, else default to queen, else the only move.
    const move =
      candidates.find((m) => (promotion ? m.promotion === promotion : m.promotion === "q")) ??
      candidates[0];

    get().commitMove(move);
    return true;
  },

  undo: () => {
    const { history, moveLog, moves } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      state: prev,
      history: history.slice(0, -1),
      moves: moves.slice(0, -1),
      moveLog: moveLog.slice(0, -1),
      result: null,
      thinking: false,
    });
  },

  legalTargets: (from) => {
    const { variant, state } = get();
    const fromSq = parseSquare(from);
    return variant
      .legalMoves(state)
      .filter((m) => m.from === fromSq)
      .map((m) => squareName(m.to));
  },

  isPromotion: (from, to) => {
    const { variant, state } = get();
    const fromSq = parseSquare(from);
    const toSq = parseSquare(to);
    return variant
      .legalMoves(state)
      .some((m) => m.from === fromSq && m.to === toSq && !!m.promotion);
  },

  tryDrop: (pieceType, to) => {
    const { variant, state, result } = get();
    if (result) return false;
    const toSq = parseSquare(to);
    const move = variant
      .legalMoves(state)
      .find((m) => m.drop === pieceType && m.to === toSq);
    if (!move) return false;
    get().commitMove(move);
    return true;
  },

  legalDropTargets: (pieceType) => {
    const { variant, state } = get();
    return variant
      .legalMoves(state)
      .filter((m) => m.drop === pieceType)
      .map((m) => squareName(m.to));
  },
}));

/**
 * Derive captured pieces from move history.
 * Returns { w, b } where `w` = pieces White has captured (black pieces) and
 * `b` = pieces Black has captured (white pieces).
 */
export function deriveCaptured(
  moves: Move[],
  history: GameState[]
): { w: Piece[]; b: Piece[] } {
  const w: Piece[] = [];
  const b: Piece[] = [];
  moves.forEach((m, i) => {
    if (!m.captured) return;
    const mover = history[i]?.sideToMove;
    if (mover === "w") w.push(m.captured);
    else b.push(m.captured);
  });
  return { w, b };
}
