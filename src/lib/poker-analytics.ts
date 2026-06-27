import { ParsedGame, ParsedHand } from "./poker-parser";

export interface PlayerAnalytics {
  handsPlayed: number;
  handsWon: number;
  winRate: number;
  totalWon: number;
  avgBet: number;
  avgCall: number;
  avgRaise: number;
  foldRate: number;
  biggestWin: number;
  biggestLoss: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  vpip: number;
  pfr: number;
  aggressionFactor: number;
  chipHistory: { hand: number; chips: number }[];
  winningHands: Record<string, number>;
  actionCounts: { calls: number; raises: number; bets: number; folds: number; checks: number };
}

export interface HeadToHead {
  calls: { count: number; avgAmount: number };
  raises: { count: number; avgAmount: number };
  folds: number;
}

export interface GameAnalytics {
  summary: {
    totalHands: number;
    avgPotSize: number;
    biggestPot: number;
    duration?: number;
  };
  playerStats: Record<string, PlayerAnalytics>;
  headToHead: Record<string, Record<string, HeadToHead>>;
  potSizes: { hand: number; pot: number }[];
  actionDistribution: Record<string, Record<string, number>>;
  winningHandTypes: Record<string, number>;
}

export function computeAnalytics(game: ParsedGame): GameAnalytics {
  const { hands } = game;

  // Summary
  const pots = hands.map((h) => h.potSize || 0).filter((p) => p > 0);
  const totalHands = hands.length;
  const avgPotSize = pots.length > 0 ? pots.reduce((a, b) => a + b, 0) / pots.length : 0;
  const biggestPot = pots.length > 0 ? Math.max(...pots) : 0;

  let duration: number | undefined;
  const firstHand = hands[0];
  const lastHand = hands[hands.length - 1];
  if (firstHand?.startTime && lastHand?.endTime) {
    duration = Math.round((lastHand.endTime.getTime() - firstHand.startTime.getTime()) / 1000);
  }

  // Collect all player names
  const allPlayersSet = new Set<string>();
  for (const hand of hands) {
    for (const event of hand.events) {
      allPlayersSet.add(event.playerName);
    }
    if (hand.startingStacks) {
      for (const name of Object.keys(hand.startingStacks)) {
        allPlayersSet.add(name);
      }
    }
  }
  const allPlayers = Array.from(allPlayersSet);

  // Player stats
  const playerStats: Record<string, PlayerAnalytics> = {};
  for (const name of allPlayers) {
    playerStats[name] = computePlayerStats(name, hands);
  }

  // Head to head
  const headToHead: Record<string, Record<string, HeadToHead>> = {};
  for (const p1 of allPlayers) {
    headToHead[p1] = {};
    for (const p2 of allPlayers) {
      if (p1 !== p2) {
        headToHead[p1][p2] = computeHeadToHead(p1, p2, hands);
      }
    }
  }

  // Pot sizes over time
  const potSizes = hands
    .filter((h) => h.potSize && h.potSize > 0)
    .map((h) => ({ hand: h.handNumber, pot: h.potSize! }));

  // Action distribution per player
  const actionDistribution: Record<string, Record<string, number>> = {};
  for (const name of allPlayers) {
    actionDistribution[name] = { calls: 0, raises: 0, bets: 0, folds: 0, checks: 0 };
    const actionMap: Record<string, string> = { call: 'calls', raise: 'raises', bet: 'bets', fold: 'folds', check: 'checks' };
    for (const hand of hands) {
      for (const event of hand.events) {
        if (event.playerName === name) {
          const mapped = actionMap[event.action];
          if (mapped && mapped in actionDistribution[name]) {
            actionDistribution[name][mapped]++;
          }
        }
      }
    }
  }

  // Winning hand types
  const winningHandTypes: Record<string, number> = {};
  for (const hand of hands) {
    if (hand.winHand) {
      const type = hand.winHand.trim().split(",")[0].trim();
      winningHandTypes[type] = (winningHandTypes[type] || 0) + 1;
    }
  }

  return {
    summary: { totalHands, avgPotSize, biggestPot, duration },
    playerStats,
    headToHead,
    potSizes,
    actionDistribution,
    winningHandTypes,
  };
}

function computePlayerStats(name: string, hands: ParsedHand[]): PlayerAnalytics {
  let handsPlayed = 0;
  let handsWon = 0;
  let totalWon = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let calls = 0;
  let raises = 0;
  let bets = 0;
  let folds = 0;
  let checks = 0;
  const callAmounts: number[] = [];
  const betAmounts: number[] = [];
  const raiseAmounts: number[] = [];
  let vpipHands = 0;
  let pfrHands = 0;
  const chipHistory: { hand: number; chips: number }[] = [];
  const winningHands: Record<string, number> = {};

  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLoseStreak = 0;
  let currentLoseStreak = 0;

  let runningChips = 0; // Track relative chip changes

  for (const hand of hands) {
    const playerEvents = hand.events.filter((e) => e.playerName === name);
    if (playerEvents.length === 0 && !(hand.startingStacks && name in hand.startingStacks)) continue;

    handsPlayed++;

    // Track starting stacks for chip history
    if (hand.startingStacks && hand.startingStacks[name] !== undefined) {
      runningChips = hand.startingStacks[name];
    }

    // Compute net for this hand: winAmount - totalPutIn
    const totalPutInForChips = playerEvents
      .filter((e) => ["call", "raise", "bet", "small_blind", "big_blind"].includes(e.action))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const wonThisHand = hand.winner === name ? (hand.winAmount || 0) : 0;
    runningChips += wonThisHand - totalPutInForChips;

    // VPIP: voluntarily put money in pot (call/raise/bet pre-flop, excluding blinds)
    const preFlopActions = playerEvents.filter(
      (e) => e.position === "Pre Flop" && !["small_blind", "big_blind", "win", "show"].includes(e.action)
    );
    const voluntaryPreFlop = preFlopActions.some((e) => ["call", "raise", "bet"].includes(e.action));
    if (voluntaryPreFlop) vpipHands++;

    // PFR: pre-flop raise
    const preFlopRaise = preFlopActions.some((e) => e.action === "raise");
    if (preFlopRaise) pfrHands++;

    // Count actions
    for (const e of playerEvents) {
      switch (e.action) {
        case "call":
          calls++;
          if (e.amount) callAmounts.push(e.amount);
          break;
        case "raise":
          raises++;
          if (e.amount) raiseAmounts.push(e.amount);
          break;
        case "bet":
          bets++;
          if (e.amount) betAmounts.push(e.amount);
          break;
        case "fold":
          folds++;
          break;
        case "check":
          checks++;
          break;
      }
    }

    // Win tracking
    const won = hand.winner === name;
    if (won) {
      handsWon++;
      const winAmount = hand.winAmount || 0;
      totalWon += winAmount;
      if (winAmount > biggestWin) biggestWin = winAmount;
      currentStreak++;
      longestWinStreak = Math.max(longestWinStreak, currentStreak);
      currentLoseStreak = 0;

      if (hand.winHand) {
        const type = hand.winHand.trim().split(",")[0].trim();
        winningHands[type] = (winningHands[type] || 0) + 1;
      }
    } else {
      // Calculate loss for this hand (sum of amounts put in)
      const totalPutIn = playerEvents
        .filter((e) => ["call", "raise", "bet", "small_blind", "big_blind"].includes(e.action))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      if (totalPutIn > biggestLoss) biggestLoss = totalPutIn;

      currentStreak = 0;
      currentLoseStreak++;
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
    }

    chipHistory.push({ hand: hand.handNumber, chips: runningChips });
  }

  const totalActions = calls + raises + bets + folds + checks;
  const aggressionFactor = calls > 0 ? (raises + bets) / calls : raises + bets;

  return {
    handsPlayed,
    handsWon,
    winRate: handsPlayed > 0 ? (handsWon / handsPlayed) * 100 : 0,
    totalWon,
    avgBet: betAmounts.length > 0 ? betAmounts.reduce((a, b) => a + b, 0) / betAmounts.length : 0,
    avgCall: callAmounts.length > 0 ? callAmounts.reduce((a, b) => a + b, 0) / callAmounts.length : 0,
    avgRaise: raiseAmounts.length > 0 ? raiseAmounts.reduce((a, b) => a + b, 0) / raiseAmounts.length : 0,
    foldRate: totalActions > 0 ? (folds / totalActions) * 100 : 0,
    biggestWin,
    biggestLoss,
    longestWinStreak,
    longestLoseStreak,
    vpip: handsPlayed > 0 ? (vpipHands / handsPlayed) * 100 : 0,
    pfr: handsPlayed > 0 ? (pfrHands / handsPlayed) * 100 : 0,
    aggressionFactor,
    chipHistory,
    winningHands,
    actionCounts: { calls, raises, bets, folds, checks },
  };
}

function computeHeadToHead(p1: string, p2: string, hands: ParsedHand[]): HeadToHead {
  let callCount = 0;
  let callTotal = 0;
  let raiseCount = 0;
  let raiseTotal = 0;
  let foldCount = 0;

  for (const hand of hands) {
    const p1Events = hand.events.filter((e) => e.playerName === p1);
    const p2InHand = hand.events.some((e) => e.playerName === p2);
    if (!p2InHand) continue;

    for (const e of p1Events) {
      if (e.action === "call") {
        callCount++;
        callTotal += e.amount || 0;
      } else if (e.action === "raise") {
        raiseCount++;
        raiseTotal += e.amount || 0;
      } else if (e.action === "fold") {
        foldCount++;
      }
    }
  }

  return {
    calls: { count: callCount, avgAmount: callCount > 0 ? callTotal / callCount : 0 },
    raises: { count: raiseCount, avgAmount: raiseCount > 0 ? raiseTotal / raiseCount : 0 },
    folds: foldCount,
  };
}
