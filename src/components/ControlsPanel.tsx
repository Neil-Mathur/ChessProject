"use client";

import type { ReactNode } from "react";
import { VARIANTS } from "@/engine";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";
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

      <Collapsible title="Opponents">
        <div className="flex flex-col gap-3">
          <RadioGroup
            label="White"
            name="white-ctrl"
            value={prefs.aiWhite ? "ai" : "human"}
            onChange={(v) => prefs.setAiWhite(v === "ai")}
            options={[
              { value: "human", label: "Human" },
              { value: "ai",    label: "Computer" },
            ]}
          />
          <RadioGroup
            label="Black"
            name="black-ctrl"
            value={prefs.aiBlack ? "ai" : "human"}
            onChange={(v) => prefs.setAiBlack(v === "ai")}
            options={[
              { value: "human", label: "Human" },
              { value: "ai",    label: "Computer" },
            ]}
          />
          <RadioGroup
            label="Difficulty"
            name="difficulty"
            value={String(prefs.aiDepth)}
            onChange={(v) => prefs.setAiDepth(Number(v))}
            options={[
              { value: "2", label: "Easy" },
              { value: "3", label: "Medium" },
              { value: "4", label: "Hard" },
            ]}
          />
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

function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-zinc-400">{label}</span>
      <div className="flex gap-3">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-emerald-500"
            />
            <span className={value === opt.value ? "text-white" : "text-zinc-400"}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
