"use client";

import AIController from "./AIController";
import AuthButton from "./AuthButton";
import BoardPanel from "./BoardPanel";
import ControlsPanel from "./ControlsPanel";
import PreferenceSync from "./PreferenceSync";

export default function ChessGame() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 px-4 py-8">
      <header className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight">Chess Variants</h1>
          <p className="text-sm text-zinc-400">
            Play locally or against the computer.
            {process.env.NEXT_PUBLIC_MULTIPLAYER === "true" && (
              <> &nbsp;·&nbsp;<a href="/lobby" className="underline hover:text-zinc-200">Play online</a></>
            )}
          </p>
        </div>
        <AuthButton />
      </header>
      <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
        <BoardPanel />
        <ControlsPanel />
      </div>
      <AIController />
      <PreferenceSync />
    </main>
  );
}
