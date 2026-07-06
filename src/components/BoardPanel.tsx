"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { toFen, type Color, type PieceType } from "@/engine";
import { useGameStore } from "@/store/gameStore";
import { usePreferences } from "@/store/preferences";
import { getBoardTheme } from "@/theme/boardThemes";
import { getPieceSet } from "@/theme/pieceSets";
import PocketBar from "./PocketBar";
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
  const tryDrop = useGameStore((s) => s.tryDrop);
  const legalTargets = useGameStore((s) => s.legalTargets);
  const legalDropTargets = useGameStore((s) => s.legalDropTargets);
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
  const [dropSel, setDropSel] = useState<PieceType | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  // Clear any selection whenever the position changes (move applied, AI move…).
  useEffect(() => {
    setSelected(null);
    setDropSel(null);
  }, [state]);

  const theme = getBoardTheme(boardThemeId);
  const pieceSet = getPieceSet(pieceSetId);
  const position = useMemo(() => toFen(state), [state]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (dropSel) {
      for (const t of legalDropTargets(dropSel)) {
        styles[t] = {
          background:
            "radial-gradient(circle, rgba(80,200,120,0.55) 26%, transparent 30%)",
        };
      }
    } else if (selected) {
      styles[selected] = { background: "rgba(255, 235, 59, 0.5)" };
      for (const t of legalTargets(selected)) {
        styles[t] = {
          background:
            "radial-gradient(circle, rgba(0,0,0,0.28) 22%, transparent 26%)",
        };
      }
    }
    return styles;
  }, [selected, dropSel, legalTargets, legalDropTargets]);

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
    setDropSel(null);
    if (!targetSquare || locked) return false;
    return attemptMove(sourceSquare, targetSquare);
  }

  function handleSquareClick({ square }: { square: string }) {
    if (locked || pending) return;

    // Drop mode (Crazyhouse): place the selected pocket piece.
    if (dropSel) {
      if (tryDrop(dropSel, square)) {
        setDropSel(null);
        return;
      }
      // not a legal drop square — fall through so clicking own piece selects it
    }

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
      setDropSel(null);
    } else {
      setSelected(null);
    }
  }

  function selectDrop(type: PieceType) {
    setSelected(null);
    setDropSel((prev) => (prev === type ? null : type));
  }

  function choosePromotion(type: PieceType) {
    if (pending) tryMove(pending.from, pending.to, type);
    setPending(null);
    setSelected(null);
  }

  const pockets = state.pockets;
  const topColor: Color = orientation === "white" ? "b" : "w";
  const bottomColor: Color = orientation === "white" ? "w" : "b";
  const pocketActive = (color: Color) =>
    !locked && !pending && state.sideToMove === color;

  return (
    <div className="flex flex-col gap-2" style={{ width: "clamp(260px, calc(100vh - 200px), 460px)" }}>
      {pockets && (
        <PocketBar
          color={topColor}
          pieces={pockets[topColor]}
          active={pocketActive(topColor)}
          selected={state.sideToMove === topColor ? dropSel : null}
          onSelect={selectDrop}
        />
      )}

      <div className="relative">
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

      {pockets && (
        <PocketBar
          color={bottomColor}
          pieces={pockets[bottomColor]}
          active={pocketActive(bottomColor)}
          selected={state.sideToMove === bottomColor ? dropSel : null}
          onSelect={selectDrop}
        />
      )}
    </div>
  );
}
