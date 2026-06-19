"use client";

import type { Color, PieceType } from "@/engine";
import PieceGlyph from "./PieceGlyph";

const ORDER: PieceType[] = ["q", "r", "b", "n", "p"];

/**
 * Crazyhouse pocket: the pieces a color holds in hand. When `active`, clicking
 * a piece selects it for dropping onto the board.
 */
export default function PocketBar({
  color,
  pieces,
  active,
  selected,
  onSelect,
}: {
  color: Color;
  pieces: PieceType[];
  active: boolean;
  selected: PieceType | null;
  onSelect: (type: PieceType) => void;
}) {
  const counts = {} as Record<PieceType, number>;
  for (const t of pieces) counts[t] = (counts[t] ?? 0) + 1;
  const entries = ORDER.filter((t) => counts[t]);

  return (
    <div className="flex min-h-[44px] w-full max-w-[560px] items-center gap-1 rounded-md bg-zinc-800/40 px-2 py-1">
      {entries.length === 0 ? (
        <span className="text-xs text-zinc-600">Pocket empty</span>
      ) : (
        entries.map((t) => (
          <button
            key={t}
            type="button"
            disabled={!active}
            onClick={() => onSelect(t)}
            aria-label={`Drop ${color}${t.toUpperCase()}`}
            className={`relative flex h-9 w-9 items-center justify-center rounded transition-colors ${
              selected === t
                ? "bg-yellow-400/30 ring-2 ring-yellow-400"
                : active
                ? "hover:bg-zinc-700/60"
                : ""
            } ${active ? "cursor-pointer" : "cursor-default opacity-80"}`}
          >
            <PieceGlyph color={color} type={t} size={24} />
            {counts[t] > 1 && (
              <span className="absolute -bottom-0.5 -right-0.5 rounded bg-zinc-900 px-1 text-[10px] leading-tight text-zinc-200">
                {counts[t]}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
