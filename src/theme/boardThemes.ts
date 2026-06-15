// Board (square) skins. Purely cosmetic data — independent of variant rules.
export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "green", name: "Tournament Green", light: "#ebecd0", dark: "#779556" },
  { id: "blue", name: "Ocean Blue", light: "#dee3e6", dark: "#5b88b5" },
  { id: "walnut", name: "Walnut", light: "#e8c99b", dark: "#9b6a3b" },
  { id: "slate", name: "Slate", light: "#cfd8dc", dark: "#546e7a" },
  { id: "rose", name: "Rosewood", light: "#f3dbd6", dark: "#a05c6b" },
];

export const DEFAULT_BOARD_THEME_ID = "green";

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
