export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function extractGameId(input: string): string | null {
  // Handle various URL formats or direct game ID
  const patterns = [
    /pokernow\.com\/games\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  // If it looks like a raw game ID
  if (/^[a-zA-Z0-9_-]+$/.test(input.trim())) return input.trim();
  return null;
}

interface PlayerInfo {
  names: string[];
  net: number;
  buyInSum: number;
  [key: string]: unknown;
}

interface PokerNowResponse {
  playersInfos: Record<string, PlayerInfo>;
}

async function recalculateDebts() {
  // Delete all existing unpaid debts
  await prisma.debt.deleteMany({ where: { paid: false } });

  // Get all game results grouped by player
  const allResults = await prisma.gameResult.findMany({
    include: { player: true },
  });

  // Calculate total net per player
  const balanceMap: Record<string, number> = {};
  for (const r of allResults) {
    const name = r.player.name;
    balanceMap[name] = (balanceMap[name] || 0) + r.net;
  }

  // Subtract already-paid debts (paid ones remain as historical record)
  const paidDebts = await prisma.debt.findMany({ where: { paid: true } });
  for (const d of paidDebts) {
    // Payment means fromName paid toName, so fromName's balance goes up, toName's goes down
    balanceMap[d.fromName] = (balanceMap[d.fromName] || 0) + d.amount;
    balanceMap[d.toName] = (balanceMap[d.toName] || 0) - d.amount;
  }

  // Split into creditors and debtors
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const [name, balance] of Object.entries(balanceMap)) {
    if (balance > 0.01) creditors.push({ name, amount: balance });
    else if (balance < -0.01) debtors.push({ name, amount: -balance });
  }

  // Sort descending
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Get the latest game for linking debts
  const latestGame = await prisma.game.findFirst({ orderBy: { createdAt: "desc" } });
  if (!latestGame) return [];

  // Greedy matching
  const newDebts: { fromName: string; toName: string; amount: number }[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
    if (transfer > 0.01) {
      newDebts.push({
        fromName: debtors[di].name,
        toName: creditors[ci].name,
        amount: Math.round(transfer * 100) / 100,
      });
    }
    creditors[ci].amount -= transfer;
    debtors[di].amount -= transfer;
    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  // Create new debts
  if (newDebts.length > 0) {
    await prisma.debt.createMany({
      data: newDebts.map((d) => ({
        ...d,
        gameId: latestGame.id,
        paid: false,
      })),
    });
  }

  return newDebts;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url as string;
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const gameId = extractGameId(url);
    if (!gameId) {
      return NextResponse.json({ error: "Could not extract game ID from URL" }, { status: 400 });
    }

    // Check if game already imported
    const existing = await prisma.game.findUnique({ where: { pokernowId: gameId } });
    if (existing) {
      return NextResponse.json({ error: "Game already imported", gameId: existing.id }, { status: 409 });
    }

    // Fetch game data from PokerNow
    const apiUrl = `https://www.pokernow.com/games/${gameId}/players_sessions`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch game data: ${response.status}` }, { status: 502 });
    }

    const data: PokerNowResponse = await response.json();
    if (!data.playersInfos) {
      return NextResponse.json({ error: "Invalid game data format" }, { status: 400 });
    }

    // Create game
    const game = await prisma.game.create({
      data: { pokernowId: gameId },
    });

    // Process players and results
    const results: { playerName: string; buyIn: number; net: number }[] = [];

    for (const [, info] of Object.entries(data.playersInfos)) {
      const playerName = info.names[0];
      const net = info.net / 100; // Convert to shekels
      const buyIn = info.buyInSum / 100;

      // Create or find player
      let player = await prisma.player.findUnique({ where: { name: playerName } });
      if (!player) {
        player = await prisma.player.create({ data: { name: playerName } });
      }

      // Create game result
      await prisma.gameResult.create({
        data: {
          gameId: game.id,
          playerId: player.id,
          buyIn,
          net,
          rawData: JSON.parse(JSON.stringify(info)),
        },
      });

      results.push({ playerName, buyIn, net });
    }

    // Recalculate debts
    const debts = await recalculateDebts();

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        pokernowId: gameId,
        playedAt: game.playedAt,
      },
      results: results.sort((a, b) => b.net - a.net),
      debts,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
