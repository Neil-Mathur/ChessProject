import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [{ whiteUserId: userId }, { blackUserId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Transform the response: parse moveLog and compute user's outcome
    const gamesWithDetails = games.map((g) => {
      const moves = JSON.parse(g.moveLog) as string[];
      return {
        id: g.id,
        variantId: g.variantId,
        outcome: g.outcome,
        reason: g.reason,
        moveCount: moves.length,
        moves: moves,
        playedAsWhite: g.whiteUserId === userId,
        playedAsBlack: g.blackUserId === userId,
        won:
          g.outcome === "draw"
            ? false
            : (g.outcome === "white") === (g.whiteUserId === userId),
        createdAt: g.createdAt,
      };
    });

    return NextResponse.json(gamesWithDetails);
  } catch (err) {
    console.error("Failed to fetch games:", err);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
