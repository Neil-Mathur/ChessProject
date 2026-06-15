"use client";

import AIController from "./AIController";
import BoardPanel from "./BoardPanel";
import ControlsPanel from "./ControlsPanel";

export default function ChessGame() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Chess Variants</h1>
        <p className="text-sm text-zinc-400">
          Play locally or against the computer.
        </p>
      </header>
      <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
        <BoardPanel />
        <ControlsPanel />
      </div>
      <AIController />
    </main>
  );
}
