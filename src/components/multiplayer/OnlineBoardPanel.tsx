"use client";
// Board panel for online play. Does NOT use useGameStore.
// All state comes from useMultiplayerGame; moves are sent to the server.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { toFen, parseSquare, squareName } from "@/engine/board";
import type { Color, GameResult, GameState, Move, PieceType } from "@/engine/types";
import type { Variant } from "@/engine/variant";
import { usePreferences } from "@/store/preferences";
import { getBoardTheme } from "@/theme/boardThemes";
import { getPieceSet } from "@/theme/pieceSets";
import PocketBar from "@/components/PocketBar";
import PromotionDialog from "@/components/PromotionDialog";

interface Pending { from: string; to: string; color: Color }

interface Props {
  state: GameState;
  variant: Variant;
  myColor: Color;
  result: GameResult | null;
  locked: boolean; // true when it's the opponent's turn or the game is over
  onMove: (move: Move) => void;
}

export default function OnlineBoardPanel({
  state,
  variant,
  myColor,
  result,
  locked,
  onMove,
}: Props) {
  const boardThemeId = usePreferences((s) => s.boardThemeId);
  const pieceSetId = usePreferences((s) => s.pieceSetId);

  const [selected, setSelected] = useState<string | null>(null);
  const [dropSel, setDropSel] = useState<PieceType | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    setSelected(null);
    setDropSel(null);
  }, [state]);

  const theme = getBoardTheme(boardThemeId);
  const pieceSet = getPieceSet(pieceSetId);
  const position = useMemo(() => toFen(state), [state]);

  const legalMovesFromSquare = useMemo(() => {
    if (locked) return {};
    const map: Record<string, Move[]> = {};
    for (const m of variant.legalMoves(state)) {
      const from = squareName(m.from);
      (map[from] ??= []).push(m);
    }
    return map;
  }, [locked, state, variant]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (dropSel) {
      const targets = variant
        .legalMoves(state)
        .filter((m) => m.drop === dropSel)
        .map((m) => squareName(m.to));
      for (const t of targets) {
        styles[t] = {
          background: "radial-gradient(circle, rgba(80,200,120,0.55) 26%, transparent 30%)",
        };
      }
    } else if (selected) {
      styles[selected] = { background: "rgba(255, 235, 59, 0.5)" };
      for (const m of legalMovesFromSquare[selected] ?? []) {
        styles[squareName(m.to)] = {
          background: "radial-gradient(circle, rgba(0,0,0,0.28) 22%, transparent 26%)",
        };
      }
    }
    return styles;
  }, [selected, dropSel, state, variant, legalMovesFromSquare]);

  function attemptMove(from: string, to: string): boolean {
    const fromSq = parseSquare(from);
    const toSq = parseSquare(to);
    const candidates = (legalMovesFromSquare[from] ?? []).filter((m) => m.to === toSq);
    if (candidates.length === 0) return false;
    if (candidates.some((m) => !!m.promotion)) {
      setPending({ from, to, color: myColor });
      return false;
    }
    const move = candidates.find((m) => m.promotion === "q") ?? candidates[0];
    onMove(move);
    return true;
  }

  function handleDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) {
    setSelected(null);
    setDropSel(null);
    if (!targetSquare || locked) return false;
    return attemptMove(sourceSquare, targetSquare);
  }

  function handleSquareClick({ square }: { square: string }) {
    if (locked || pending) return;

    if (dropSel) {
      const toSq = parseSquare(square);
      const move = variant.legalMoves(state).find((m) => m.drop === dropSel && m.to === toSq);
      if (move) { onMove(move); setDropSel(null); return; }
    }

    if (selected) {
      if (square === selected) { setSelected(null); return; }
      if (attemptMove(selected, square)) { setSelected(null); return; }
    }

    if ((legalMovesFromSquare[square] ?? []).length > 0) {
      setSelected(square);
      setDropSel(null);
    } else {
      setSelected(null);
    }
  }

  function choosePromotion(type: PieceType) {
    if (!pending) return;
    const fromSq = parseSquare(pending.from);
    const toSq = parseSquare(pending.to);
    const move = variant.legalMoves(state).find(
      (m) => m.from === fromSq && m.to === toSq && m.promotion === type
    );
    if (move) onMove(move);
    setPending(null);
    setSelected(null);
  }

  const pockets = state.pockets;
  const topColor: Color = myColor === "w" ? "b" : "w";
  const bottomColor: Color = myColor;
  const pocketActive = (color: Color) => !locked && !pending && state.sideToMove === color;

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-2">
      {pockets && (
        <PocketBar
          color={topColor}
          pieces={pockets[topColor]}
          active={pocketActive(topColor)}
          selected={state.sideToMove === topColor ? dropSel : null}
          onSelect={(t) => { setSelected(null); setDropSel((p) => (p === t ? null : t)); }}
        />
      )}

      <div className="relative">
        <Chessboard
          options={{
            position,
            boardOrientation: myColor === "w" ? "white" : "black",
            onPieceDrop: handleDrop,
            onSquareClick: handleSquareClick,
            pieces: pieceSet.pieces,
            squareStyles,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
            allowDragging: !locked && !pending,
            id: "online-board",
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
          onSelect={(t) => { setSelected(null); setDropSel((p) => (p === t ? null : t)); }}
        />
      )}
    </div>
  );
}
