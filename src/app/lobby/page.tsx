"use client";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

// Guard: if multiplayer is dark, redirect to home.
if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
  redirect("/");
}

const Lobby = dynamic(() => import("@/components/multiplayer/Lobby"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-zinc-400">
      Loading…
    </div>
  ),
});

export default function LobbyPage() {
  return <Lobby />;
}
