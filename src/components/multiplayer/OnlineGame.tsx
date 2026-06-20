"use client";
import Link from "next/link";
import { useMultiplayerGame } from "@/multiplayer/useMultiplayerGame";
import OnlineBoardPanel from "./OnlineBoardPanel";

interface Props { roomId: string }

export default function OnlineGame({ roomId }: Props) {
  const { state, variant, myColor, moveLog, result, status, statusMessage, sendMove, resign } =
    useMultiplayerGame(roomId);

  const colorLabel = myColor === "w" ? "White" : myColor === "b" ? "Black" : "—";

  // Status bar color
  const statusColor =
    status === "playing" ? "text-emerald-400" :
    status === "over" ? "text-amber-400" :
    status === "error" ? "text-red-400" :
    "text-zinc-400";

  const resultBanner = result
    ? result.outcome === "draw"
      ? "Draw"
      : result.outcome === (myColor === "w" ? "white" : "black")
      ? "You win!"
      : "You lose"
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-6 px-4 py-6">
      {/* Room info strip */}
      <p className="w-full text-sm text-zinc-500">
        Room&nbsp;
        <span className="font-mono font-semibold tracking-widest text-zinc-300">{roomId}</span>
        &nbsp;·&nbsp;You are&nbsp;
        <span className="font-semibold text-zinc-300">{colorLabel}</span>
      </p>

      {/* Status bar */}
      <div className={`w-full rounded-lg bg-zinc-800/60 px-4 py-2 text-sm font-medium ${statusColor}`}>
        {resultBanner ? (
          <span className="text-lg font-bold">
            {resultBanner}{" "}
            <span className="text-sm font-normal text-zinc-400">
              ({result!.reason})
            </span>
          </span>
        ) : (
          <>
            {statusMessage}
            {status === "waiting" && (
              <button
                className="ml-4 rounded bg-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-600"
                onClick={() => navigator.clipboard.writeText(roomId)}
              >
                Copy code
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex w-full flex-col items-start gap-8 md:flex-row md:justify-center">
        {/* Board */}
        {state && variant && myColor ? (
          <OnlineBoardPanel
            state={state}
            variant={variant}
            myColor={myColor}
            locked={status !== "playing" || state.sideToMove !== myColor}
            onMove={sendMove}
          />
        ) : (
          <div className="flex h-[400px] w-full max-w-[560px] items-center justify-center rounded-xl bg-zinc-800/40 text-zinc-500">
            {status === "error" ? statusMessage : "Waiting for game to start…"}
          </div>
        )}

        {/* Side panel */}
        <div className="flex w-full max-w-[220px] flex-col gap-4">
          {/* Turn indicator */}
          {state && status === "playing" && !result && (
            <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-sm">
              {state.sideToMove === myColor
                ? <span className="font-semibold text-emerald-400">Your turn</span>
                : <span className="text-zinc-400">Opponent&apos;s turn…</span>}
            </div>
          )}

          {/* Move log */}
          {moveLog.length > 0 && (
            <div className="rounded-lg bg-zinc-800/60 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Moves</p>
              <ol className="max-h-60 overflow-y-auto text-sm leading-6">
                {moveLog.map((m, i) => (
                  <li key={i} className={i % 2 === 0 ? "text-zinc-200" : "text-zinc-400"}>
                    {i % 2 === 0 && (
                      <span className="mr-1 text-zinc-600">{Math.floor(i / 2) + 1}.</span>
                    )}
                    {m}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {status === "playing" && !result && (
              <button
                className="rounded-lg border border-red-700/50 bg-red-900/30 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/50"
                onClick={resign}
              >
                Resign
              </button>
            )}
            {status === "over" && (
              <Link href="/lobby" className="btn text-center text-sm">
                New game
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
