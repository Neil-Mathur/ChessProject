// Shared Socket.IO event types — imported by both the server and client.
// No React/DOM imports here; this is pure TypeScript.
import type { Color, GameResult, GameState, Move } from "@/engine/types";

export interface RoomInfo {
  roomId: string;
  color: Color;
  variantId: string;
  state: GameState;
  moveLog: string[];
  result: GameResult | null;
  /** Opaque token stored in sessionStorage; proves identity on reconnect. */
  playerToken: string;
}

// Events client → server
export interface ClientToServer {
  create_room: (
    variantId: string,
    cb: (info: RoomInfo) => void
  ) => void;
  join_room: (
    data: { roomId: string; playerToken?: string },
    cb: (res: { ok: true; info: RoomInfo } | { ok: false; error: string }) => void
  ) => void;
  move: (data: { move: Move }) => void;
  resign: () => void;
}

// Events server → client
export interface ServerToClient {
  opponent_joined: () => void;
  state_update: (data: {
    state: GameState;
    moveLog: string[];
    result: GameResult | null;
    lastMove: Move;
  }) => void;
  opponent_disconnected: () => void;
  opponent_reconnected: () => void;
  game_over: (data: { result: GameResult }) => void;
  error: (message: string) => void;
}
