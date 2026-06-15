"use client";

import type { ReactNode } from "react";
import { VARIANTS } from "@/engine";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";
import { BOARD_THEMES } from "@/theme/boardThemes";
import { PIECE_SETS } from "@/theme/pieceSets";
import Collapsible from "./Collapsible";
import CapturedPanel from "./CapturedPanel";

export default function ControlsPanel() {
  const variant = useGameStore((s) => s.variant);
  const state = useGameStore((s) => s.state);
  const result = useGameStore((s) => s.result);
  const thinking = useGameStore((s) => s.thinking);
  const moveLog = useGameStore((s) => s.moveLog);
  const newGame = useGameStore((s) => s.newGame);
  const undo = useGameStore((s) => s.undo);

  const prefs = usePreferences();

  function selectVariant(id: string) {
    prefs.setVariant(id);
    newGame(id);
  }

  const sideName = state.sideToMove === "w" ? "White" : "Black";
  const status = result
    ? result.outcome === "draw"
      ? `Draw — ${result.reason}`
      : `${result.outcome === "white" ? "White" : "Black"} wins — ${result.reason}`
    : thinking
    ? "Computer is thinking…"
    : `${sideName} to move` +
      (state.movesRemaining > 1 ? ` — ${state.movesRemaining} moves left` : "");

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-sm">
      <div>
        <h2 className="mb-1 text-lg font-semibold">{variant.name}</h2>
        <p className="text-zinc-400">{variant.description}</p>
      </div>

      <div
        className={`rounded-md px-3 py-2 font-medium ${
          result ? "bg-emerald-600/20 text-emerald-300" : "bg-zinc-700/40"
        }`}
      >
        {status}
      </div>

      <div className="flex gap-2">
        <button className="btn" onClick={() => newGame(prefs.variantId)}>
          New game
        </button>
        <button className="btn" onClick={undo}>
          Undo
        </button>
        <button
          className="btn"
          onClick={() =>
            prefs.setOrientation(prefs.orientation === "white" ? "black" : "white")
          }
        >
          Flip
        </button>
      </div>

      <Collapsible title="Opponents">
        <div className="flex flex-col gap-3">
          <Field label="White">
            <select
              className="select"
              value={prefs.aiWhite ? "ai" : "human"}
              onChange={(e) => prefs.setAiWhite(e.target.value === "ai")}
            >
              <option value="human">Human</option>
              <option value="ai">Computer</option>
            </select>
          </Field>
          <Field label="Black">
            <select
              className="select"
              value={prefs.aiBlack ? "ai" : "human"}
              onChange={(e) => prefs.setAiBlack(e.target.value === "ai")}
            >
              <option value="human">Human</option>
              <option value="ai">Computer</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              className="select"
              value={prefs.aiDepth}
              onChange={(e) => prefs.setAiDepth(Number(e.target.value))}
            >
              <option value={2}>Easy</option>
              <option value={3}>Medium</option>
              <option value={4}>Hard</option>
            </select>
          </Field>
        </div>
      </Collapsible>

      <Collapsible title="Settings">
        <div className="flex flex-col gap-3">
          <Field label="Variant">
            <select
              className="select"
              value={prefs.variantId}
              onChange={(e) => selectVariant(e.target.value)}
            >
              {VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Board skin">
            <select
              className="select"
              value={prefs.boardThemeId}
              onChange={(e) => prefs.setBoardTheme(e.target.value)}
            >
              {BOARD_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Piece skin">
            <select
              className="select"
              value={prefs.pieceSetId}
              onChange={(e) => prefs.setPieceSet(e.target.value)}
            >
              {PIECE_SETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Collapsible>

      <Collapsible title="Captured">
        <CapturedPanel />
      </Collapsible>

      <Collapsible title="Moves">
        <div className="flex max-h-48 flex-wrap gap-x-3 gap-y-1 overflow-y-auto font-mono text-xs text-zinc-300">
          {moveLog.length === 0 ? (
            <span className="text-zinc-500">No moves yet</span>
          ) : (
            moveLog.map((m, i) => (
              <span key={i}>
                <span className="text-zinc-500">{i + 1}.</span> {m}
              </span>
            ))
          )}
        </div>
      </Collapsible>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
