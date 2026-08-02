import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const OUTCOMES = new Set(["white", "black", "draw"]);
const MAX_MOVES = 1024;
const MAX_MOVE_LEN = 16;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { variantId, outcome, reason, moveLog, playedWhite, playedBlack } =
    (body ?? {}) as Record<string, unknown>;

  const validMoves =
    Array.isArray(moveLog) &&
    moveLog.length > 0 &&
    moveLog.length <= MAX_MOVES &&
    moveLog.every((m) => typeof m === "string" && m.length <= MAX_MOVE_LEN);

  if (
    typeof variantId !== "string" ||
    typeof outcome !== "string" ||
    !OUTCOMES.has(outcome) ||
    typeof reason !== "string" ||
    !validMoves ||
    (!playedWhite && !playedBlack)
  ) {
    return NextResponse.json({ error: "Invalid game data" }, { status: 400 });
  }

  const game = await prisma.game.create({
    data: {
      variantId,
      outcome,
      reason,
      moveLog: JSON.stringify(moveLog),
      whiteUserId: playedWhite ? session.user.id : undefined,
      blackUserId: playedBlack ? session.user.id : undefined,
    },
  });

  return NextResponse.json({ id: game.id }, { status: 201 });
}

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
