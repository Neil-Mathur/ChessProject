// Attaches Socket.IO to the HTTP server. Called only when MULTIPLAYER=true.
// No React/Next.js imports — pure Node.js + engine.
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import { getVariant, squareName, fileOf } from "@/engine";
import type { Color, GameState, Move } from "@/engine/types";
import type { ClientToServer, ServerToClient } from "@/multiplayer/protocol";
import {
  createRoom,
  getRoom,
  scheduleCleanup,
  pruneRooms,
  colorForToken,
} from "./gameRoom";
import { prisma } from "@/lib/prisma";

/** Per-socket data attached during the handshake. */
interface SocketData {
  /** Authenticated user id from the Auth.js session cookie, or null if anonymous. */
  userId: string | null;
}

/**
 * Resolve the signed-in user from the Auth.js JWT session cookie sent with the
 * Socket.IO handshake. The cookie is signed with AUTH_SECRET, so — unlike a
 * client-supplied payload — it cannot be forged to record games as another user.
 */
async function userIdFromHandshake(cookie: string | undefined): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!cookie || !secret) return null;
  try {
    const token = await getToken({
      req: { headers: { cookie } },
      secret,
      secureCookie: cookie.includes("__Secure-authjs.session-token"),
    });
    return typeof token?.id === "string" ? token.id : null;
  } catch {
    return null;
  }
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

async function persistGame(
  variantId: string,
  outcome: string,
  reason: string,
  moveLog: string[],
  whiteUserId: string | null,
  blackUserId: string | null
): Promise<void> {
  try {
    await prisma.game.create({
      data: {
        variantId,
        outcome,
        reason,
        moveLog: JSON.stringify(moveLog),
        whiteUserId: whiteUserId || undefined,
        blackUserId: blackUserId || undefined,
      },
    });
  } catch (err) {
    console.error("Failed to persist game:", err);
  }
}

function describeMove(state: GameState, move: Move): string {
  if (move.drop) return `${move.drop.toUpperCase()}@${squareName(move.to)}`;
  if (move.castle === "k") return "O-O";
  if (move.castle === "q") return "O-O-O";
  const piece = state.board[move.from]!;
  const target = squareName(move.to);
  const capture = move.captured ? "x" : "";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  if (piece.type === "p") {
    const fromFile = capture ? `${FILES[fileOf(move.from)]}x` : "";
    return `${fromFile}${target}${promo}`;
  }
  return `${piece.type.toUpperCase()}${capture}${target}${promo}`;
}

export function attachSocketIO(httpServer: HttpServer): void {
  const io = new SocketIOServer<
    ClientToServer,
    ServerToClient,
    Record<string, never>,
    SocketData
  >(httpServer, {
    // Same-origin clients don't need CORS; only allow the production domain
    // cross-origin. Dev stays open for LAN/preview testing.
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://madchesslab.com", "https://www.madchesslab.com"]
          : "*",
      methods: ["GET", "POST"],
    },
  });

  // Authenticate the handshake once per connection; handlers read socket.data.
  io.use(async (socket, next) => {
    socket.data.userId = await userIdFromHandshake(socket.handshake.headers.cookie);
    next();
  });

  io.on("connection", (socket) => {
    let joinedRoomId: string | null = null;
    let myColor: Color | null = null;

    socket.on("create_room", (variantId, cb) => {
      try {
        const variant = getVariant(variantId);
        const state = variant.setup();
        const room = createRoom(variantId, state);
        room.players.w = socket.id;
        room.userIds.w = socket.data.userId;
        myColor = "w";
        joinedRoomId = room.id;
        socket.join(room.id);
        cb({
          roomId: room.id,
          color: "w",
          variantId,
          state,
          moveLog: [],
          result: null,
          playerToken: room.tokens.w!,
        });
      } catch {
        socket.emit("error", "Failed to create room.");
      }
    });

    socket.on("join_room", ({ roomId, playerToken }, cb) => {
      const room = getRoom(roomId);
      if (!room) return cb({ ok: false, error: "Room not found." });
      if (room.result) return cb({ ok: false, error: "That game has already ended." });

      // Reconnect by token.
      if (playerToken) {
        const color = colorForToken(room, playerToken);
        if (color) {
          room.players[color] = socket.id;
          myColor = color;
          joinedRoomId = room.id;
          if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
          room.cleanupTimer = null;
          socket.join(room.id);
          socket.to(room.id).emit("opponent_reconnected");
          return cb({
            ok: true,
            info: {
              roomId: room.id,
              color,
              variantId: room.variantId,
              state: room.state,
              moveLog: room.moveLog,
              result: room.result,
              playerToken,
            },
          });
        }
      }

      // Fresh join — assign Black if the slot is open.
      if (room.players.b !== null) return cb({ ok: false, error: "Room is full." });
      const token = Math.random().toString(36).slice(2, 18).toUpperCase();
      room.tokens.b = token;
      room.players.b = socket.id;
      room.userIds.b = socket.data.userId;
      myColor = "b";
      joinedRoomId = room.id;
      socket.join(room.id);
      socket.to(room.id).emit("opponent_joined");
      cb({
        ok: true,
        info: {
          roomId: room.id,
          color: "b",
          variantId: room.variantId,
          state: room.state,
          moveLog: room.moveLog,
          result: room.result,
          playerToken: token,
        },
      });
    });

    socket.on("move", ({ move }) => {
      if (!joinedRoomId || !myColor) return;
      const room = getRoom(joinedRoomId);
      if (!room || room.result) return;
      if (room.state.sideToMove !== myColor) return;

      const variant = getVariant(room.variantId);
      const legal = variant.legalMoves(room.state);
      const matched = legal.find(
        (l) =>
          l.from === move.from &&
          l.to === move.to &&
          (!move.promotion || l.promotion === move.promotion) &&
          (!move.drop || l.drop === move.drop)
      );
      if (!matched) return; // illegal move — silently ignore

      const notation = describeMove(room.state, matched);
      const next = variant.applyMove(room.state, matched);
      const result = variant.result(next);
      room.state = next;
      room.moveLog = [...room.moveLog, notation];
      room.result = result ?? null;

      io.to(room.id).emit("state_update", {
        state: next,
        moveLog: room.moveLog,
        result: room.result,
        lastMove: matched,
      });

      // Persist the game if it has ended.
      if (room.result) {
        persistGame(
          room.variantId,
          room.result.outcome,
          room.result.reason,
          room.moveLog,
          room.userIds.w,
          room.userIds.b
        ).catch(() => {
          // Logging is already done in persistGame
        });
      }
    });

    socket.on("resign", () => {
      if (!joinedRoomId || !myColor) return;
      const room = getRoom(joinedRoomId);
      if (!room || room.result) return;
      const outcome = myColor === "w" ? "black" : "white";
      room.result = { outcome, reason: "Resignation" };
      io.to(room.id).emit("game_over", { result: room.result });

      // Persist the game.
      persistGame(
        room.variantId,
        room.result.outcome,
        room.result.reason,
        room.moveLog,
        room.userIds.w,
        room.userIds.b
      ).catch(() => {
        // Logging is already done in persistGame
      });
    });

    socket.on("disconnect", () => {
      if (!joinedRoomId || !myColor) return;
      const room = getRoom(joinedRoomId);
      if (!room) return;
      room.players[myColor] = null;
      socket.to(room.id).emit("opponent_disconnected");
      // Clean up if both sides are gone for 5 minutes.
      if (!room.players.w && !room.players.b) {
        scheduleCleanup(room, 5 * 60_000);
      }
    });
  });

  // Prune stale rooms every 30 minutes.
  setInterval(pruneRooms, 30 * 60_000);

  console.log("> Socket.IO attached — multiplayer enabled");
}
