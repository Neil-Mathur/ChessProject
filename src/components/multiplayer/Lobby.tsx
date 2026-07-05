"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VARIANTS } from "@/engine/variants";
import { getSocket } from "@/multiplayer/socket";
import type { RoomInfo } from "@/multiplayer/protocol";

const TOKEN_KEY = (roomId: string) => `mp_token_${roomId}`;

export default function Lobby() {
  const router = useRouter();
  const [variantId, setVariantId] = useState("standard");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  function handleCreate() {
    setCreating(true);
    setError("");
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function doCreate() {
      socket.emit("create_room", variantId, (info: RoomInfo) => {
        sessionStorage.setItem(TOKEN_KEY(info.roomId), info.playerToken);
        router.push(`/play/${info.roomId}`);
      });
    }

    if (socket.connected) {
      doCreate();
    } else {
      socket.once("connect", doCreate);
      socket.once("connect_error", () => {
        setCreating(false);
        setError("Could not connect to game server.");
      });
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setError("");
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function doJoin() {
      socket.emit("join_room", { roomId: code }, (res) => {
        if (!res.ok) {
          setJoining(false);
          setError(res.error);
          return;
        }
        sessionStorage.setItem(TOKEN_KEY(res.info.roomId), res.info.playerToken);
        router.push(`/play/${res.info.roomId}`);
      });
    }

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
      socket.once("connect_error", () => {
        setJoining(false);
        setError("Could not connect to game server.");
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Play Online</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create a game and share the room code, or join a friend&apos;s game.
        </p>
      </div>

      {/* Create game */}
      <section className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Create a game</h2>
        <label className="mb-1 block text-sm text-zinc-400">Variant</label>
        <select
          className="select mb-4 w-full"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {VARIANTS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <button
          className="btn w-full"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Creating…" : "Create game (play as White)"}
        </button>
      </section>

      {/* Join game */}
      <section className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Join a game</h2>
        <label className="mb-1 block text-sm text-zinc-400">Room code</label>
        <input
          className="select mb-4 w-full tracking-widest uppercase"
          placeholder="e.g. X7K2M9"
          maxLength={6}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button
          className="btn w-full"
          onClick={handleJoin}
          disabled={joining || joinCode.trim().length === 0}
        >
          {joining ? "Joining…" : "Join game (play as Black)"}
        </button>
      </section>

      {error && (
        <p className="text-sm font-medium text-red-400">{error}</p>
      )}
    </main>
  );
}
