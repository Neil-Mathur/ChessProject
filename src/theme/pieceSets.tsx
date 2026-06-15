// Piece skins. A PieceSet either uses react-chessboard's built-in pieces
// (pieces = undefined) or provides a PieceRenderObject keyed by "wP", "bK", ...
//
// This is where future image-based sets (cburnett, alpha, etc.) plug in:
// each entry just returns the artwork for that piece code.
import type { PieceRenderObject } from "react-chessboard";

export interface PieceSet {
  id: string;
  name: string;
  /** undefined => use the library's default SVG pieces. */
  pieces?: PieceRenderObject;
}

// Unicode glyph set — a real alternate skin that needs no asset files.
const GLYPHS: Record<string, string> = {
  K: "♚",
  Q: "♛",
  R: "♜",
  B: "♝",
  N: "♞",
  P: "♟",
};

const PIECE_CODES = [
  "wK", "wQ", "wR", "wB", "wN", "wP",
  "bK", "bQ", "bR", "bB", "bN", "bP",
];

function buildGlyphSet(): PieceRenderObject {
  const obj: PieceRenderObject = {};
  for (const code of PIECE_CODES) {
    const color = code[0] as "w" | "b";
    const glyph = GLYPHS[code[1]];
    obj[code] = () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "80%",
          lineHeight: 1,
          color: color === "w" ? "#f8f8f8" : "#202020",
          textShadow:
            color === "w"
              ? "0 0 2px #000, 0 0 2px #000"
              : "0 0 2px #fff, 0 0 1px #fff",
          userSelect: "none",
        }}
      >
        {glyph}
      </div>
    );
  }
  return obj;
}

export const PIECE_SETS: PieceSet[] = [
  { id: "default", name: "Classic (SVG)" },
  { id: "glyph", name: "Unicode Glyphs", pieces: buildGlyphSet() },
];

export const DEFAULT_PIECE_SET_ID = "default";

export function getPieceSet(id: string): PieceSet {
  return PIECE_SETS.find((s) => s.id === id) ?? PIECE_SETS[0];
}
