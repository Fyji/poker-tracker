import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      gameResults: {
        include: { player: true },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: game.id,
    pokernowId: game.pokernowId,
    playedAt: game.playedAt,
    playerCount: game.gameResults.length,
    totalPot: game.gameResults.reduce((sum, r) => sum + r.buyIn, 0),
    results: game.gameResults
      .map((r) => ({
        playerName: r.player.name,
        buyIn: r.buyIn,
        net: r.net,
      }))
      .sort((a, b) => b.net - a.net),
  });
}
