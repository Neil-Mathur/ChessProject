"use client";

import { useEffect, useRef } from "react";
import { requestBestMove } from "@/ai/botClient";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";

/**
 * Headless component: whenever it's a computer-controlled side's turn, asks the
 * worker for a move and applies it. A token ref invalidates stale/in-flight
 * requests (React strict mode double-invokes, dependency changes, etc.).
 */
export default function AIController() {
  const state = useGameStore((s) => s.state);
  const variant = useGameStore((s) => s.variant);
  const result = useGameStore((s) => s.result);
  const commitMove = useGameStore((s) => s.commitMove);
  const setThinking = useGameStore((s) => s.setThinking);

  const aiWhite = usePreferences((s) => s.aiWhite);
  const aiBlack = usePreferences((s) => s.aiBlack);
  const aiDepth = usePreferences((s) => s.aiDepth);

  const token = useRef(0);

  useEffect(() => {
    const isAI = state.sideToMove === "w" ? aiWhite : aiBlack;
    if (result || !isAI) {
      setThinking(false);
      return;
    }

    const myToken = ++token.current;
    setThinking(true);
    requestBestMove(state, variant.id, aiDepth).then((move) => {
      if (token.current !== myToken) return; // superseded
      setThinking(false);
      if (move) commitMove(move);
    });

    return () => {
      // Invalidate this request so a late resolution is ignored.
      token.current++;
    };
  }, [state, variant.id, aiWhite, aiBlack, aiDepth, result, commitMove, setThinking]);

  return null;
}
