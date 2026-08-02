import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await prisma.game.findMany({
    where: {
      OR: [{ whiteUserId: session.user.id }, { blackUserId: session.user.id }],
    },
    select: {
      id: true,
      variantId: true,
      outcome: true,
      reason: true,
      moveLog: true,
      createdAt: true,
      endedAt: true,
      whiteUser: { select: { name: true } },
      blackUser: { select: { name: true } },
      whiteUserId: true,
      blackUserId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(games);
}
