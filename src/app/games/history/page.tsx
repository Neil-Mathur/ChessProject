"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface GameRecord {
  id: string;
  variantId: string;
  outcome: string;
  reason: string;
  moveLog: string;
  createdAt: string;
  endedAt: string;
  whiteUser: { name: string | null } | null;
  blackUser: { name: string | null } | null;
  whiteUserId: string | null;
  blackUserId: string | null;
}

export default function GameHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      fetchGames();
    }
  }, [status, router]);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games/history");
      const data = await res.json();
      setGames(data);
    } catch (error) {
      console.error("Failed to fetch games:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = (game: GameRecord) => {
    setSelectedGame(game);
    try {
      const parsedMoves = JSON.parse(game.moveLog);
      setMoves(Array.isArray(parsedMoves) ? parsedMoves : []);
    } catch {
      setMoves([]);
    }
  };

  const getResultColor = (game: GameRecord) => {
    if (!session?.user?.id) return "";
    const isWhite = game.whiteUserId === session.user.id;
    if (game.outcome === "draw") return "text-blue-400";
    if ((isWhite && game.outcome === "white") || (!isWhite && game.outcome === "black")) {
      return "text-green-400";
    }
    return "text-red-400";
  };

  const getResultText = (game: GameRecord) => {
    if (!session?.user?.id) return "";
    const isWhite = game.whiteUserId === session.user.id;
    if (game.outcome === "draw") return "Draw";
    if ((isWhite && game.outcome === "white") || (!isWhite && game.outcome === "black")) {
      return "Won";
    }
    return "Lost";
  };

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-screen text-zinc-400">Loading…</div>;
  }

  return (
    <div className="flex gap-6 p-6 max-w-7xl mx-auto">
      {/* Games List */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4 text-white">Game History</h1>

        {games.length === 0 ? (
          <div className="text-zinc-400">No games yet</div>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game)}
                className={`w-full p-4 text-left border rounded transition-colors ${
                  selectedGame?.id === game.id
                    ? "border-zinc-500 bg-zinc-800"
                    : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-sm text-zinc-400">
                      {game.whiteUser?.name || "Anonymous"} (White) vs{" "}
                      {game.blackUser?.name || "Anonymous"} (Black)
                    </div>
                    <div className={`text-sm font-semibold ${getResultColor(game)}`}>
                      {getResultText(game)} • {game.reason}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDistanceToNow(new Date(game.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-xs text-zinc-400">{game.variantId}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Game Details */}
      {selectedGame && (
        <div className="w-80 p-4 border border-zinc-700 rounded bg-zinc-900">
          <h2 className="text-lg font-bold mb-4 text-white">Move Notation</h2>

          <div className="mb-4 space-y-1 text-sm">
            <div>
              <span className="text-zinc-400">White:</span> {selectedGame.whiteUser?.name || "Anonymous"}
            </div>
            <div>
              <span className="text-zinc-400">Black:</span> {selectedGame.blackUser?.name || "Anonymous"}
            </div>
            <div>
              <span className="text-zinc-400">Variant:</span> {selectedGame.variantId}
            </div>
            <div>
              <span className="text-zinc-400">Result:</span> {selectedGame.outcome === "draw" ? "Draw" : `${selectedGame.outcome} wins`}
            </div>
            <div>
              <span className="text-zinc-400">Reason:</span> {selectedGame.reason}
            </div>
            <div>
              <span className="text-zinc-400">Date:</span>{" "}
              {new Date(selectedGame.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-4">
            <div className="text-sm font-semibold mb-3 text-white">Moves ({moves.length})</div>
            <div className="bg-zinc-800 rounded p-3 max-h-96 overflow-y-auto">
              {moves.length > 0 ? (
                <div className="text-xs space-y-1">
                  {moves.map((move, idx) => (
                    <div key={idx} className="text-zinc-300">
                      <span className="text-zinc-500">{idx + 1}.</span> {move}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No moves recorded</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
