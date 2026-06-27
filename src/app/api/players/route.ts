export const dynamic = "force-dynamic";
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

    // Win rate
    const wins = p.gameResults.filter((r) => r.net > 0).length;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    // Biggest win & loss
    const nets = p.gameResults.map((r) => r.net);
    const biggestWin = nets.length > 0 ? Math.max(...nets) : 0;
    const biggestLoss = nets.length > 0 ? Math.min(...nets) : 0;

    // Average buy-in
    const avgBuyIn = gamesPlayed > 0
      ? p.gameResults.reduce((sum, r) => sum + r.buyIn, 0) / gamesPlayed
      : 0;

    // Current streak
    let streak = 0;
    let streakType: "win" | "loss" | "none" = "none";
    for (let i = p.gameResults.length - 1; i >= 0; i--) {
      const net = p.gameResults[i].net;
      if (i === p.gameResults.length - 1) {
        streakType = net > 0 ? "win" : net < 0 ? "loss" : "none";
        streak = 1;
      } else {
        const currentType = net > 0 ? "win" : net < 0 ? "loss" : "none";
        if (currentType === streakType && streakType !== "none") {
          streak++;
        } else {
          break;
        }
      }
    }

    // Cumulative PnL over time for charts
    let cumulative = 0;
    const pnlHistory = p.gameResults.map((r) => {
      cumulative += r.net;
      return {
        date: r.game.playedAt,
        gameId: r.gameId,
        net: Math.round(r.net * 100) / 100,
        buyIn: Math.round(r.buyIn * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });

    return {
      name: p.name,
      gamesPlayed,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgPnL: Math.round(avgPnL * 100) / 100,
      winRate,
      biggestWin: Math.round(biggestWin * 100) / 100,
      biggestLoss: Math.round(biggestLoss * 100) / 100,
      avgBuyIn: Math.round(avgBuyIn * 100) / 100,
      streak,
      streakType,
      pnlHistory,
    };
  });

  formatted.sort((a, b) => b.totalPnL - a.totalPnL);

  return NextResponse.json(formatted);
}
