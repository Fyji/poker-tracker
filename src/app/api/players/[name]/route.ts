import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  
  const player = await prisma.player.findUnique({
    where: { name: decodedName },
    include: {
      gameResults: {
        include: { game: true },
        orderBy: { game: { playedAt: "asc" } },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const gamesPlayed = player.gameResults.length;
  const totalPnL = player.gameResults.reduce((sum, r) => sum + r.net, 0);
  const avgPnL = gamesPlayed > 0 ? totalPnL / gamesPlayed : 0;

  let cumulative = 0;
  const pnlHistory = player.gameResults.map((r) => {
    cumulative += r.net;
    return {
      date: r.game.playedAt,
      gameId: r.gameId,
      net: r.net,
      buyIn: r.buyIn,
      cumulative: Math.round(cumulative * 100) / 100,
    };
  });

  return NextResponse.json({
    name: player.name,
    gamesPlayed,
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgPnL: Math.round(avgPnL * 100) / 100,
    pnlHistory,
  });
}
