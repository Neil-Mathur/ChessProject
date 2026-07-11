"use client";

import { useEffect, useRef } from "react";
import { requestBestMove } from "@/ai/botClient";
import { requestStockfishMove } from "@/ai/stockfishClient";
import { toFullFen } from "@/engine";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";

/**
 * Headless component: whenever it's a computer-controlled side's turn, asks the
 * worker for a move and applies it. A token ref invalidates stale/in-flight
 * requests (React strict mode double-invokes, dependency changes, etc.).
 *
 * Standard Chess uses Stockfish 18 (WASM) via UCI.
 * All other variants use the built-in alpha-beta engine.
 */
export default function AIController() {
  const state = useGameStore((s) => s.state);
  const variant = useGameStore((s) => s.variant);
  const result = useGameStore((s) => s.result);
  const commitMove = useGameStore((s) => s.commitMove);
  const tryMove = useGameStore((s) => s.tryMove);
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

    if (variant.id === "standard") {
      // Stockfish via UCI
      const fen = toFullFen(state);
      requestStockfishMove(fen, aiDepth).then((uciMove) => {
        if (token.current !== myToken) return;
        setThinking(false);
        if (uciMove) {
          const from = uciMove.slice(0, 2);
          const to = uciMove.slice(2, 4);
          const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
          tryMove(from, to, promotion);
        }
      });
    } else {
      // Built-in alpha-beta for all other variants
      requestBestMove(state, variant.id, aiDepth).then((move) => {
        if (token.current !== myToken) return;
        setThinking(false);
        if (move) commitMove(move);
      });
    }

    return () => {
      // Bump the token to invalidate any in-flight request.
      // We intentionally mutate the ref here, not read a captured value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      token.current++;
    };
  }, [state, variant.id, aiWhite, aiBlack, aiDepth, result, commitMove, tryMove, setThinking]);

  return null;
}
