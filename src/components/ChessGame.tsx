"use client";

import AIController from "./AIController";
import BoardPanel from "./BoardPanel";
import ControlsPanel from "./ControlsPanel";
import PreferenceSync from "./PreferenceSync";

export default function ChessGame() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 px-4 py-8">
      <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
        <BoardPanel />
        <ControlsPanel />
      </div>
      <AIController />
      <PreferenceSync />
    </main>
  );
}
