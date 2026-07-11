// User preferences. Persisted to localStorage for now; in Phase 3 the same
// shape will be synced to the database after Google sign-in.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_VARIANT_ID } from "@/engine";
import { DEFAULT_BOARD_THEME_ID } from "@/theme/boardThemes";
import { DEFAULT_PIECE_SET_ID } from "@/theme/pieceSets";

export interface Preferences {
  variantId: string;
  boardThemeId: string;
  pieceSetId: string;
  orientation: "white" | "black";
  /** Which sides the computer controls. */
  aiWhite: boolean;
  aiBlack: boolean;
  /** Search depth in plies (difficulty). */
  aiDepth: number;
  setVariant: (id: string) => void;
  setBoardTheme: (id: string) => void;
  setPieceSet: (id: string) => void;
  setOrientation: (o: "white" | "black") => void;
  setAiWhite: (v: boolean) => void;
  setAiBlack: (v: boolean) => void;
  setAiDepth: (v: number) => void;
}

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      variantId: DEFAULT_VARIANT_ID,
      boardThemeId: DEFAULT_BOARD_THEME_ID,
      pieceSetId: DEFAULT_PIECE_SET_ID,
      orientation: "white",
      aiWhite: false,
      aiBlack: false,
      aiDepth: 10,
      setVariant: (variantId) => set({ variantId }),
      setBoardTheme: (boardThemeId) => set({ boardThemeId }),
      setPieceSet: (pieceSetId) => set({ pieceSetId }),
      setOrientation: (orientation) => set({ orientation }),
      setAiWhite: (aiWhite) => set({ aiWhite }),
      setAiBlack: (aiBlack) => set({ aiBlack }),
      setAiDepth: (aiDepth) => set({ aiDepth }),
    }),
    { name: "chess-preferences" }
  )
);
