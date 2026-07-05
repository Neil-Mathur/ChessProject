"use client";

import { useGameStore } from "@/store/gameStore";
import AIController from "./AIController";
import BoardPanel from "./BoardPanel";
import ControlsPanel from "./ControlsPanel";
import PreferenceSync from "./PreferenceSync";

export default function ChessGame() {
  const variant = useGameStore((s) => s.variant);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-6 px-4 py-8">
      {/* Variant name + description above the board */}
      <div className="w-full">
        <h2 className="text-xl font-semibold">{variant.name}</h2>
        <p className="mt-0.5 text-sm text-zinc-400">{variant.description}</p>
      </div>

      <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
        <BoardPanel />
        <ControlsPanel />
      </div>
      <AIController />
      <PreferenceSync />
    </main>
  );
}
