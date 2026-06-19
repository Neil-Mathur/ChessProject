import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const prefs = await prisma.preferences.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json(prefs);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const data = {
    variantId: String(body.variantId),
    boardThemeId: String(body.boardThemeId),
    pieceSetId: String(body.pieceSetId),
    orientation: body.orientation === "black" ? "black" : "white",
    aiWhite: !!body.aiWhite,
    aiBlack: !!body.aiBlack,
    aiDepth: Number(body.aiDepth) || 3,
  };
  const prefs = await prisma.preferences.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });
  return NextResponse.json(prefs);
}
