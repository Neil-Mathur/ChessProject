"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GameRecord {
  id: string;
  variantId: string;
  outcome: string;
  reason: string;
  moveCount: number;
  playedAsWhite: boolean;
  playedAsBlack: boolean;
  won: boolean;
  createdAt: Date;
}

export default function GamesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status !== "authenticated") return;

    async function fetchGames() {
      try {
        const res = await fetch("/api/games");
        if (!res.ok) throw new Error("Failed to fetch games");
        const data = await res.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-center text-zinc-400">Loading…</p>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  const wins = games.filter((g) => g.won).length;
  const losses = games.filter((g) => !g.won && g.outcome !== "draw").length;
  const draws = games.filter((g) => g.outcome === "draw").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Game History</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {session?.user?.email}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-500 bg-red-950 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-center text-zinc-400">Loading games…</p>
      )}

      {!loading && games.length === 0 && (
        <div className="rounded border border-zinc-700 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No games yet.</p>
          <Link href="/lobby" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            Play online
          </Link>
        </div>
      )}

      {!loading && games.length > 0 && (
        <>
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{wins}</p>
              <p className="text-xs text-zinc-400">Wins</p>
            </div>
            <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{draws}</p>
              <p className="text-xs text-zinc-400">Draws</p>
            </div>
            <div className="rounded border border-zinc-700 bg-zinc-900 p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{losses}</p>
              <p className="text-xs text-zinc-400">Losses</p>
            </div>
          </div>

          <div className="space-y-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-xs text-zinc-400">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Variant</th>
                  <th className="px-4 py-2">Color</th>
                  <th className="px-4 py-2">Result</th>
                  <th className="px-4 py-2">Moves</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const date = new Date(game.createdAt);
                  const isWin = game.won;
                  const isDraw = game.outcome === "draw";
                  const resultColor = isDraw
                    ? "text-gray-300"
                    : isWin
                      ? "text-green-400"
                      : "text-red-400";

                  return (
                    <tr
                      key={game.id}
                      className="border-b border-zinc-800 hover:bg-zinc-900"
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 capitalize">{game.variantId}</td>
                      <td className="px-4 py-3 text-xs">
                        {game.playedAsWhite ? "White" : "Black"}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${resultColor}`}>
                        {isDraw ? "Draw" : isWin ? "Won" : "Lost"}
                        <br />
                        <span className="text-xs font-normal text-zinc-500">
                          {game.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-400">
                        {game.moveCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
