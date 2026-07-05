"use client";

import { BOARD_THEMES } from "@/theme/boardThemes";
import { PIECE_SETS } from "@/theme/pieceSets";
import { usePreferences } from "@/store/preferences";

export default function SettingsPage() {
  const prefs = usePreferences();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>

      <section className="flex flex-col gap-5">
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
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
