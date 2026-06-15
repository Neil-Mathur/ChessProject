"use client";

import dynamic from "next/dynamic";

// Render fully client-side: the game reads localStorage-backed preferences,
// so SSR would cause a hydration mismatch.
const ChessGame = dynamic(() => import("@/components/ChessGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-zinc-400">
      Loading board…
    </div>
  ),
});

export default function Home() {
  return <ChessGame />;
}
