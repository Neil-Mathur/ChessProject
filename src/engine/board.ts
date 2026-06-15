// Board / square helpers and FEN export (for rendering).
import { Color, GameState, Piece, Square } from "./types";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const fileOf = (sq: Square): number => sq % 8;
export const rankOf = (sq: Square): number => Math.floor(sq / 8);
export const squareIndex = (file: number, rank: number): Square => rank * 8 + file;
export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

/** Square index -> algebraic name, e.g. 0 -> "a1", 63 -> "h8". */
export function squareName(sq: Square): string {
  return `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
}

/** Algebraic name -> square index, e.g. "e4" -> 28. */
export function parseSquare(name: string): Square {
  const file = FILES.indexOf(name[0]);
  const rank = parseInt(name[1], 10) - 1;
  return squareIndex(file, rank);
}

export function cloneBoard(board: (Piece | null)[]): (Piece | null)[] {
  return board.map((p) => (p ? { ...p } : null));
}

function pieceToChar(piece: Piece): string {
  const ch = piece.type;
  return piece.color === "w" ? ch.toUpperCase() : ch;
}

/** react-chessboard piece identifier, e.g. white pawn -> "wP". */
export function piecePositionId(piece: Piece): string {
  return `${piece.color}${piece.type.toUpperCase()}`;
}

/** Export the piece placement + side-to-move as a FEN string for rendering. */
export function toFen(state: GameState): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = state.board[squareIndex(file, rank)];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += pieceToChar(piece);
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return `${rows.join("/")} ${state.sideToMove} - - 0 1`;
}

/** Find the square of the given side's king, or -1 if captured. */
export function findKing(board: (Piece | null)[], color: Color): Square {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (p && p.type === "k" && p.color === color) return sq;
  }
  return -1;
}

export function emptyBoard(): (Piece | null)[] {
  return new Array(64).fill(null);
}

/** Place pieces from a compact map of algebraic square -> "wP" style id. */
export function placePieces(map: Record<string, string>): (Piece | null)[] {
  const board = emptyBoard();
  for (const [name, id] of Object.entries(map)) {
    board[parseSquare(name)] = {
      color: id[0] as Color,
      type: id[1].toLowerCase() as Piece["type"],
    };
  }
  return board;
}
