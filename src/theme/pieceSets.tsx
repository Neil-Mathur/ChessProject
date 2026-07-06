/* eslint-disable react/display-name */
import type { CSSProperties } from "react";
import type { PieceRenderObject } from "react-chessboard";

export interface PieceSet {
  id: string;
  name: string;
  /** undefined => use the library's default SVG pieces. */
  pieces?: PieceRenderObject;
}

const PIECE_CODES = ["wK","wQ","wR","wB","wN","wP","bK","bQ","bR","bB","bN","bP"] as const;

// ── Unicode glyph set ──────────────────────────────────────────────────────────
// Use white-chess chars (♔♕…) for white and black-chess chars (♚♛…) for black.
// U+FE0E forces text-mode rendering (no emoji substitution) so CSS color applies.
const VS_TEXT = "︎";
const WHITE_GLYPHS: Record<string, string> = {
  K: "♔" + VS_TEXT, Q: "♕" + VS_TEXT, R: "♖" + VS_TEXT,
  B: "♗" + VS_TEXT, N: "♘" + VS_TEXT, P: "♙" + VS_TEXT,
};
const BLACK_GLYPHS: Record<string, string> = {
  K: "♚" + VS_TEXT, Q: "♛" + VS_TEXT, R: "♜" + VS_TEXT,
  B: "♝" + VS_TEXT, N: "♞" + VS_TEXT, P: "♟" + VS_TEXT,
};

function buildGlyphSet(): PieceRenderObject {
  const obj: PieceRenderObject = {};
  for (const code of PIECE_CODES) {
    const isWhite = code[0] === "w";
    const glyph = (isWhite ? WHITE_GLYPHS : BLACK_GLYPHS)[code[1]];
    obj[code] = () => (
      <svg viewBox="0 0 45 45" width="100%" height="100%">
        <text
          x="22.5"
          y="37"
          textAnchor="middle"
          fontSize="40"
          fill={isWhite ? "#ffffff" : "#1a1a1a"}
          stroke={isWhite ? "#000000" : "rgba(255,255,255,0.45)"}
          strokeWidth={isWhite ? "1.5" : "1"}
          paintOrder="stroke"
          fontFamily="serif"
        >
          {glyph}
        </text>
      </svg>
    );
  }
  return obj;
}

// ── Minecraft pixel-art set ────────────────────────────────────────────────────
// Each piece is a tiny pixel-art sprite rendered as SVG rects.
// '.' = transparent. Every other char is looked up in the palette.

type Palette = Record<string, string>;

function pixelPiece(rows: string[], palette: Palette) {
  const H = rows.length;
  const W = rows[0].length;
  const cells: { x: number; y: number; fill: string }[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (palette[c]) cells.push({ x, y, fill: palette[c] });
    })
  );
  const style: CSSProperties = { imageRendering: "pixelated", width: "100%", height: "100%" };
  return () => (
    <svg viewBox={`0 0 ${W} ${H}`} style={style}>
      {cells.map(({ x, y, fill }, i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill={fill} />
      ))}
    </svg>
  );
}

function buildMinecraftSet(): PieceRenderObject {
  return {
    // ── White pieces (overworld / friendly) ────────────────────────────────

    // Grass block
    wP: pixelPiece([
      "..GGGG..",
      "GGGGGGGG",
      "GGGGGGGG",
      "DDDDDDDD",
      "DDDLLDDD",
      "DDDDDDDD",
      "DDDDDDDD",
      "........",
    ], { G: "#5D9C25", D: "#8B5523", L: "#A0673A" }),

    // Pig face
    wN: pixelPiece([
      ".PPPPPP.",
      "PPPPPPPP",
      "PPPPPPPP",
      "PPEPPEPP",
      "PPPPPPPP",
      ".PNNNNP.",
      "........",
      "........",
    ], { P: "#F48FB1", E: "#4E342E", N: "#CE93D8" }),

    // Diamond
    wB: pixelPiece([
      "...CC...",
      "..CCCC..",
      ".CCCCCC.",
      "CCCCCCCC",
      ".CCCCCC.",
      "..CCCC..",
      "...CC...",
      "........",
    ], { C: "#80DEEA" }),

    // Stone castle (battlements on top)
    wR: pixelPiece([
      "E.EE.EE.",
      "EEEEEEEE",
      "EEEEEEEE",
      ".EEEEEE.",
      ".EEEEEE.",
      ".EEEEEE.",
      "EEEEEEEE",
      "........",
    ], { E: "#9E9E9E" }),

    // Gold crown
    wQ: pixelPiece([
      "Y.....Y.",
      "YY...YY.",
      "YYYYYYYY",
      "YYYYYYYY",
      ".YYYYYY.",
      ".YYYYYY.",
      "..YYYY..",
      "........",
    ], { Y: "#FDD835" }),

    // Gold cross / sword hilt
    wK: pixelPiece([
      "...YY...",
      "...YY...",
      "YYYYYYYY",
      "...YY...",
      "YYYYYYYY",
      ".YYYYYY.",
      "..YYYY..",
      "........",
    ], { Y: "#FFD700" }),

    // ── Black pieces (hostile mobs) ────────────────────────────────────────

    // Zombie face
    bP: pixelPiece([
      ".ZZZZZZ.",
      "ZZZZZZZZ",
      "ZDDZZDDZ",
      "ZZZZZZZZ",
      "ZZDZZDZZ",
      "ZZDDDDZZ",
      "........",
      "........",
    ], { Z: "#66BB6A", D: "#1B5E20" }),

    // Spider (red eyes)
    bN: pixelPiece([
      "S.SSSS.S",
      "SSSSSSSS",
      "SSR..RSS",
      "SSSSSSSS",
      "..SSSS..",
      "..SSSS..",
      "........",
      "........",
    ], { S: "#212121", R: "#D32F2F" }),

    // Enderman (magenta eyes, tall thin body)
    bB: pixelPiece([
      "PPPPPPPP",
      "PMMPPMMP",
      "PPPPPPPP",
      "..PPPP..",
      "..PPPP..",
      "..PPPP..",
      "..PPPP..",
      "........",
    ], { P: "#4A148C", M: "#E040FB" }),

    // Obsidian block (dark with purple shimmer)
    bR: pixelPiece([
      "OOOOOOOO",
      "OQOOOQOO",
      "OOOOOOOO",
      "OOQOOQOO",
      "OOOOOOOO",
      "OQOOOOQO",
      "OOOOOOOO",
      "........",
    ], { O: "#1A1A2E", Q: "#4527A0" }),

    // Creeper face (10 wide for 2×2 eyes)
    bQ: pixelPiece([
      "CCCCCCCCCC",
      "CCEECCEECC",
      "CCEECCEECC",
      "CCCCCCCCCC",
      "..CCCCCC..",
      ".CC....CC.",
      ".CCCCCCCC.",
      "..........",
    ], { C: "#3E7C17", E: "#1B5E20" }),

    // Wither skull (blue eye sockets)
    bK: pixelPiece([
      ".WWWWWW.",
      "WWWWWWWW",
      "WBBWWBBW",
      "WWWWWWWW",
      "W.WWWW.W",
      "WW.WW.WW",
      "WWWWWWWW",
      "........",
    ], { W: "#424242", B: "#2196F3" }),
  };
}

export const PIECE_SETS: PieceSet[] = [
  { id: "default",   name: "Classic (SVG)" },
  { id: "glyph",     name: "Unicode Glyphs",  pieces: buildGlyphSet() },
  { id: "minecraft", name: "Minecraft",        pieces: buildMinecraftSet() },
];

export const DEFAULT_PIECE_SET_ID = "default";

export function getPieceSet(id: string): PieceSet {
  return PIECE_SETS.find((s) => s.id === id) ?? PIECE_SETS[0];
}
