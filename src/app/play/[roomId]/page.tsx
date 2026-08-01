"use client";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const OnlineGame = dynamic(() => import("@/components/multiplayer/OnlineGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-zinc-400">
      Connecting…
    </div>
  ),
});

export default function PlayPage() {
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
      router.replace("/");
    }
  }, [router]);

  if (process.env.NEXT_PUBLIC_MULTIPLAYER !== "true") {
    return null;
  }

  return <OnlineGame roomId={roomId.toUpperCase()} />;
}
