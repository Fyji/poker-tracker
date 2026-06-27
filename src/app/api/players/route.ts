import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.player.findMany({
    include: {
      gameResults: {
        include: { game: true },
        orderBy: { game: { playedAt: "asc" } },
      },
    },
  });

  const formatted = players.map((p) => {
    const gamesPlayed = p.gameResults.length;
    const totalPnL = p.gameResults.reduce((sum, r) => sum + r.net, 0);
    const avgPnL = gamesPlayed > 0 ? totalPnL / gamesPlayed : 0;

    // Cumulative PnL over time for charts
    let cumulative = 0;
    const pnlHistory = p.gameResults.map((r) => {
      cumulative += r.net;
      return {
        date: r.game.playedAt,
        gameId: r.gameId,
        net: r.net,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });

    return {
      name: p.name,
      gamesPlayed,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgPnL: Math.round(avgPnL * 100) / 100,
      pnlHistory,
    };
  });

  formatted.sort((a, b) => b.totalPnL - a.totalPnL);

  return NextResponse.json(formatted);
}
