// Server-side room state. Pure Node.js — no React/Next.js imports.
import type { Color, GameResult, GameState } from "@/engine/types";

export interface Room {
  id: string;
  variantId: string;
  state: GameState;
  /** Active socket IDs per color (null = disconnected / not yet joined). */
  players: { w: string | null; b: string | null };
  /** Persistent identity tokens per color — survive reconnects. */
  tokens: { w: string | null; b: string | null };
  /** User IDs per color (null if anonymous or not yet joined). */
  userIds: { w: string | null; b: string | null };
  moveLog: string[];
  result: GameResult | null;
  createdAt: number;
  /** setTimeout handle to clean up an abandoned room. */
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();

function randomId(len: number): string {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

export function createRoom(variantId: string, state: GameState): Room {
  const id = randomId(6);
  const room: Room = {
    id,
    variantId,
    state,
    players: { w: null, b: null },
    tokens: { w: randomId(16), b: null },
    userIds: { w: null, b: null },
    moveLog: [],
    result: null,
    createdAt: Date.now(),
    cleanupTimer: null,
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id.toUpperCase());
}

export function deleteRoom(id: string): void {
  const room = rooms.get(id);
  if (room?.cleanupTimer) clearTimeout(room.cleanupTimer);
  rooms.delete(id);
}

/** Schedule room deletion unless both players reconnect within `ms`. */
export function scheduleCleanup(room: Room, ms: number): void {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    if (!room.players.w && !room.players.b) deleteRoom(room.id);
  }, ms);
}

/** Remove stale rooms (> 2 h old, no live players). Safe to call periodically. */
export function pruneRooms(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [, room] of rooms) {
    if (room.createdAt < cutoff && !room.players.w && !room.players.b) {
      deleteRoom(room.id);
    }
  }
}

/** Resolve which color a token belongs to, or null if unrecognised. */
export function colorForToken(room: Room, token: string): Color | null {
  if (room.tokens.w === token) return "w";
  if (room.tokens.b === token) return "b";
  return null;
}
