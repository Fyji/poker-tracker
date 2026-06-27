export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const games = await prisma.game.findMany({
    include: {
      gameResults: {
        include: { player: true },
      },
    },
    orderBy: { playedAt: "desc" },
  });

  const formatted = games.map((g) => ({
    id: g.id,
    pokernowId: g.pokernowId,
    playedAt: g.playedAt,
    playerCount: g.gameResults.length,
    totalPot: g.gameResults.reduce((sum, r) => sum + r.buyIn, 0),
    csvUploaded: g.csvUploaded,
    totalHands: g.totalHands,
    results: g.gameResults
      .map((r) => ({
        playerName: r.player.name,
        buyIn: r.buyIn,
        net: r.net,
      }))
      .sort((a, b) => b.net - a.net),
  }));

  return NextResponse.json(formatted);
}
