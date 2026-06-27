export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvEntries, parsePokerLogs } from "@/lib/poker-parser";
import { computeAnalytics } from "@/lib/poker-analytics";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const csvContent = await file.text();
    const { entries, timestamps } = parseCsvEntries(csvContent);

    if (entries.length === 0) {
      return NextResponse.json({ error: "No log entries found in CSV" }, { status: 400 });
    }

    const parsed = parsePokerLogs(entries, timestamps);

    // Delete existing logs for this game
    await prisma.gameLog.deleteMany({ where: { gameId: id } });
    await prisma.handSummary.deleteMany({ where: { gameId: id } });

    // Save logs to DB in batches
    const logRecords = [];
    for (const hand of parsed.hands) {
      for (const event of hand.events) {
        logRecords.push({
          gameId: id,
          handNumber: hand.handNumber,
          position: event.position,
          playerName: event.playerName,
          action: event.action,
          amount: event.amount || null,
          cards: event.cards ? JSON.stringify(event.cards) : null,
          potSize: hand.potSize || null,
          timestamp: hand.startTime || null,
        });
      }
    }

    // Batch insert logs (500 at a time to avoid query size limits)
    for (let i = 0; i < logRecords.length; i += 500) {
      const batch = logRecords.slice(i, i + 500);
      await prisma.gameLog.createMany({ data: batch });
    }

    // Save hand summaries
    const summaryRecords = parsed.hands.map((h) => ({
      gameId: id,
      handNumber: h.handNumber,
      winner: h.winner || null,
      winAmount: h.winAmount || null,
      winHand: h.winHand || null,
      potSize: h.potSize || null,
      flop: h.flop ? JSON.stringify(h.flop) : null,
      turn: h.turn || null,
      river: h.river || null,
      duration:
        h.startTime && h.endTime
          ? Math.round((h.endTime.getTime() - h.startTime.getTime()) / 1000)
          : null,
      playerCount: h.playerCount || null,
    }));

    for (let i = 0; i < summaryRecords.length; i += 500) {
      const batch = summaryRecords.slice(i, i + 500);
      await prisma.handSummary.createMany({ data: batch });
    }

    // Update game
    await prisma.game.update({
      where: { id },
      data: { csvUploaded: true, totalHands: parsed.hands.length },
    });

    // Compute analytics
    const analytics = computeAnalytics(parsed);

    return NextResponse.json({
      success: true,
      handsProcessed: parsed.hands.length,
      playersFound: parsed.players.size,
      logsStored: logRecords.length,
      analytics,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
