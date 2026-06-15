"use client";

import type { Color, PieceType } from "@/engine";
import PieceGlyph from "./PieceGlyph";

const CHOICES: PieceType[] = ["q", "r", "b", "n"];

export default function PromotionDialog({
  color,
  onChoose,
  onCancel,
}: {
  color: Color;
  onChoose: (type: PieceType) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="rounded-lg bg-zinc-800 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-sm text-zinc-300">Promote to</p>
        <div className="flex gap-2">
          {CHOICES.map((type) => (
            <button
              key={type}
              className="flex h-14 w-14 items-center justify-center rounded-md bg-zinc-700 transition-colors hover:bg-zinc-600"
              onClick={() => onChoose(type)}
              aria-label={`Promote to ${type}`}
            >
              <PieceGlyph color={color} type={type} size={34} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
