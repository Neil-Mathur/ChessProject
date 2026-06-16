"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { toFen, type Color, type PieceType } from "@/engine";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";
import { getBoardTheme } from "@/theme/boardThemes";
import { getPieceSet } from "@/theme/pieceSets";
import PromotionDialog from "./PromotionDialog";

interface Pending {
  from: string;
  to: string;
  color: Color;
}

export default function BoardPanel() {
  const state = useGameStore((s) => s.state);
  const result = useGameStore((s) => s.result);
  const thinking = useGameStore((s) => s.thinking);
  const tryMove = useGameStore((s) => s.tryMove);
  const legalTargets = useGameStore((s) => s.legalTargets);
  const isPromotion = useGameStore((s) => s.isPromotion);

  const boardThemeId = usePreferences((s) => s.boardThemeId);
  const pieceSetId = usePreferences((s) => s.pieceSetId);
  const orientation = usePreferences((s) => s.orientation);
  const aiWhite = usePreferences((s) => s.aiWhite);
  const aiBlack = usePreferences((s) => s.aiBlack);

  // The human may not move for a computer-controlled side.
  const aiToMove = state.sideToMove === "w" ? aiWhite : aiBlack;
  const locked = !!result || thinking || aiToMove;

  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const theme = getBoardTheme(boardThemeId);
  const pieceSet = getPieceSet(pieceSetId);
  const position = useMemo(() => toFen(state), [state]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (selected) {
      styles[selected] = { background: "rgba(255, 235, 59, 0.5)" };
      for (const t of legalTargets(selected)) {
        styles[t] = {
          background:
            "radial-gradient(circle, rgba(0,0,0,0.28) 22%, transparent 26%)",
        };
      }
    }
    return styles;
    // `selected` is cleared after every move, so targets recompute when needed.
  }, [selected, legalTargets]);

  /** Apply a move, intercepting promotions to ask for a piece first. */
  function attemptMove(from: string, to: string): boolean {
    if (isPromotion(from, to)) {
      setPending({ from, to, color: state.sideToMove });
      return false; // wait for the picker; the move is applied on choice
    }
    return tryMove(from, to);
  }

  function handleDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    setSelected(null);
    if (!targetSquare || locked) return false;
    return attemptMove(sourceSquare, targetSquare);
  }

  function handleSquareClick({ square }: { square: string }) {
    if (locked || pending) return;
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (attemptMove(selected, square)) {
        setSelected(null);
        return;
      }
    }
    // Select a piece belonging to the side to move.
    if (legalTargets(square).length > 0) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  function choosePromotion(type: PieceType) {
    if (pending) tryMove(pending.from, pending.to, type);
    setPending(null);
    setSelected(null);
  }

  return (
    <div className="relative w-full max-w-[560px]">
      <Chessboard
        options={{
          position,
          boardOrientation: orientation,
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          pieces: pieceSet.pieces,
          squareStyles,
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareStyle: { backgroundColor: theme.light },
          allowDragging: !locked && !pending,
          id: "main-board",
        }}
      />
      {pending && (
        <PromotionDialog
          color={pending.color}
          onChoose={choosePromotion}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
