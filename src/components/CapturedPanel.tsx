"use client";

import { useMemo } from "react";
import type { Piece, PieceType } from "@/engine";
import { deriveCaptured, useGameStore } from "@/store/gameStore";
import PieceGlyph from "./PieceGlyph";

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const ORDER: Record<PieceType, number> = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };

function material(pieces: Piece[]): number {
  return pieces.reduce((sum, p) => sum + VALUE[p.type], 0);
}

function sortPieces(pieces: Piece[]): Piece[] {
  return [...pieces].sort((a, b) => ORDER[a.type] - ORDER[b.type]);
}

function Row({ label, pieces, advantage }: { label: string; pieces: Piece[]; advantage: number }) {
  return (
    <div className="flex min-h-[28px] items-center gap-2">
      <span className="w-12 shrink-0 text-zinc-400">{label}</span>
      <span className="flex flex-wrap items-center gap-0.5">
        {sortPieces(pieces).map((p, i) => (
          <PieceGlyph key={i} color={p.color} type={p.type} size={18} />
        ))}
      </span>
      {advantage > 0 && (
        <span className="ml-auto font-mono text-emerald-400">+{advantage}</span>
      )}
    </div>
  );
}

export default function CapturedPanel() {
  const moves = useGameStore((s) => s.moves);
  const history = useGameStore((s) => s.history);

  const { w, b } = useMemo(() => deriveCaptured(moves, history), [moves, history]);
  const diff = material(w) - material(b);

  if (w.length === 0 && b.length === 0) {
    return <span className="text-zinc-500">No captures yet</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {/* `w` = pieces White captured (black pieces); `b` = pieces Black captured. */}
      <Row label="White" pieces={w} advantage={diff} />
      <Row label="Black" pieces={b} advantage={-diff} />
    </div>
  );
}
