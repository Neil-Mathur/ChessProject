"use client";

import type { Color, PieceType } from "@/engine";

const GLYPHS: Record<PieceType, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

/** A single chess piece rendered as a Unicode glyph, colored by side. */
export default function PieceGlyph({
  color,
  type,
  size = 22,
}: {
  color: Color;
  type: PieceType;
  size?: number;
}) {
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        color: color === "w" ? "#f8f8f8" : "#202020",
        textShadow:
          color === "w"
            ? "0 0 1px #000, 0 0 1px #000"
            : "0 0 1px #fff, 0 0 1px #fff",
        userSelect: "none",
      }}
    >
      {GLYPHS[type]}
    </span>
  );
}
