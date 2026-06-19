"use client";
import { redirect, useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Guard: if multiplayer is dark, redirect to home.
if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
  redirect("/");
}

const OnlineGame = dynamic(() => import("@/components/multiplayer/OnlineGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-zinc-400">
      Connecting…
    </div>
  ),
});

export default function PlayPage() {
  const { roomId } = useParams<{ roomId: string }>();
  return <OnlineGame roomId={roomId.toUpperCase()} />;
}
