export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAnalytics } from "@/lib/poker-analytics";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        gameResults: { include: { player: true } },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Check if we have logs
    const logCount = await prisma.gameLog.count({ where: { gameId: id } });

    if (logCount === 0) {
      // No logs - return basic info only
      return NextResponse.json({
        hasLogs: false,
        csvUploaded: game.csvUploaded,
        totalHands: game.totalHands,
        game: {
          id: game.id,
          pokernowId: game.pokernowId,
          playedAt: game.playedAt,
        },
        results: game.gameResults
          .map((r) => ({
            playerName: r.player.name,
            buyIn: r.buyIn,
            net: r.net,
          }))
          .sort((a, b) => b.net - a.net),
      });
    }

    // Reconstruct entries from stored logs
    const logs = await prisma.gameLog.findMany({
      where: { gameId: id },
      orderBy: [{ handNumber: "asc" }],
    });

    const handSummaries = await prisma.handSummary.findMany({
      where: { gameId: id },
      orderBy: { handNumber: "asc" },
    });

    // Rebuild parsed game from DB records
    const handsMap = new Map<number, {
      handNumber: number;
      events: { playerName: string; action: string; amount?: number; position: string; cards?: string[] }[];
      winner?: string;
      winAmount?: number;
      winHand?: string;
      potSize?: number;
      flop?: string[];
      turn?: string;
      river?: string;
      startingStacks?: Record<string, number>;
      playerCount?: number;
      startTime?: Date;
      endTime?: Date;
    }>();

    for (const log of logs) {
      if (!handsMap.has(log.handNumber)) {
        handsMap.set(log.handNumber, {
          handNumber: log.handNumber,
          events: [],
        });
      }
      const hand = handsMap.get(log.handNumber)!;
      hand.events.push({
        playerName: log.playerName,
        action: log.action,
        amount: log.amount || undefined,
        position: log.position,
        cards: log.cards ? JSON.parse(log.cards) : undefined,
      });
    }

    // Enrich from hand summaries
    for (const summary of handSummaries) {
      const hand = handsMap.get(summary.handNumber);
      if (hand) {
        hand.winner = summary.winner || undefined;
        hand.winAmount = summary.winAmount || undefined;
        hand.winHand = summary.winHand || undefined;
        hand.potSize = summary.potSize || undefined;
        hand.flop = summary.flop ? JSON.parse(summary.flop) : undefined;
        hand.turn = summary.turn || undefined;
        hand.river = summary.river || undefined;
        hand.playerCount = summary.playerCount || undefined;
      }
    }

    const parsedGame = {
      hands: Array.from(handsMap.values()).sort((a, b) => a.handNumber - b.handNumber),
      players: new Map<string, { id: string; name: string }>(),
    };

    const analytics = computeAnalytics(parsedGame);

    return NextResponse.json({
      hasLogs: true,
      csvUploaded: game.csvUploaded,
      totalHands: game.totalHands,
      game: {
        id: game.id,
        pokernowId: game.pokernowId,
        playedAt: game.playedAt,
      },
      results: game.gameResults
        .map((r) => ({
          playerName: r.player.name,
          buyIn: r.buyIn,
          net: r.net,
        }))
        .sort((a, b) => b.net - a.net),
      analytics,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
