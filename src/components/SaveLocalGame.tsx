"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";

// Persists finished local games (vs AI or hotseat) for signed-in users.
// Multiplayer games are saved server-side by the socket server.
export default function SaveLocalGame() {
  const { data: session } = useSession();
  const result = useGameStore((s) => s.result);
  const moveLog = useGameStore((s) => s.moveLog);
  const variant = useGameStore((s) => s.variant);
  const gameId = useGameStore((s) => s.gameId);
  const aiWhite = usePreferences((s) => s.aiWhite);
  const aiBlack = usePreferences((s) => s.aiBlack);
  const savedGameId = useRef<number | null>(null);

  useEffect(() => {
    if (!result || !session?.user) return;
    if (moveLog.length === 0) return;
    if (savedGameId.current === gameId) return;
    savedGameId.current = gameId;

    fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: variant.id,
        outcome: result.outcome,
        reason: result.reason,
        moveLog,
        playedWhite: !aiWhite,
        playedBlack: !aiBlack,
      }),
    }).catch(() => {
      // Non-critical: history save failure shouldn't disrupt play.
    });
  }, [result, session, moveLog, variant, gameId, aiWhite, aiBlack]);

  return null;
}
