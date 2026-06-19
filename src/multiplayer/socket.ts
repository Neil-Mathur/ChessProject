"use client";
// Singleton socket.io-client instance. Created lazily; never auto-connects.
import { io, type Socket } from "socket.io-client";
import type { ClientToServer, ServerToClient } from "./protocol";

let socket: Socket<ServerToClient, ClientToServer> | null = null;

export function getSocket(): Socket<ServerToClient, ClientToServer> {
  if (!socket) {
    socket = io({ autoConnect: false, reconnectionAttempts: 5 });
  }
  return socket;
}
