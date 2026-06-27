// Poker log parser for PokerNow format

export interface HandEvent {
  playerName: string;
  action: string;
  amount?: number;
  position: string; // "Pre Flop", "Post Flop", "Post Turn", "Post River"
  cards?: string[];
}

export interface ParsedHand {
  handNumber: number;
  events: HandEvent[];
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
}

export interface ParsedGame {
  hands: ParsedHand[];
  players: Map<string, { id: string; name: string }>;
}

// Regex patterns
const HAND_START_RE = /-- starting hand #(\d+)/;
const HAND_END_RE = /-- ending hand #(\d+)/;
const STACKS_RE = /Player stacks:/;
const STACK_ENTRY_RE = /"([^"]+)\s+@\s+([^"]+)"\s+\(([0-9.]+)\)/g;
const SMALL_BLIND_RE = /"([^"]+)\s+@\s+[^"]+"\s+posts a small blind of\s+([0-9.]+)/;
const BIG_BLIND_RE = /"([^"]+)\s+@\s+[^"]+"\s+posts a big blind of\s+([0-9.]+)/;
const CALLS_RE = /"([^"]+)\s+@\s+[^"]+"\s+calls\s+([0-9.]+)/;
const RAISES_RE = /"([^"]+)\s+@\s+[^"]+"\s+raises to\s+([0-9.]+)/;
const BETS_RE = /"([^"]+)\s+@\s+[^"]+"\s+bets\s+([0-9.]+)/;
const FOLDS_RE = /"([^"]+)\s+@\s+[^"]+"\s+folds/;
const CHECKS_RE = /"([^"]+)\s+@\s+[^"]+"\s+checks/;
const SHOWS_RE = /"([^"]+)\s+@\s+[^"]+"\s+shows a\s+(.+)\./;
const COLLECTED_RE = /"([^"]+)\s+@\s+[^"]+"\s+collected\s+([0-9.]+)\s+from pot(?:\s+with\s+([^(]+)(?:\(combination:\s*([^)]+)\))?)?/;
const FLOP_RE = /Flop:\s*\[([^\]]+)\]/;
const TURN_RE = /Turn:.*\[([^\]]+)\]/;
const RIVER_RE = /River:.*\[([^\]]+)\]/;

function parseCards(s: string): string[] {
  return s.split(",").map((c) => c.trim()).filter(Boolean);
}

export function parsePokerLogs(entries: string[], timestamps?: Date[]): ParsedGame {
  const players = new Map<string, { id: string; name: string }>();
  const hands: ParsedHand[] = [];
  let currentHand: ParsedHand | null = null;
  let currentPosition = "Pre Flop";

  // PokerNow logs are newest-first, reverse for chronological order
  const reversed = [...entries].reverse();
  const reversedTimestamps = timestamps ? [...timestamps].reverse() : undefined;

  for (let i = 0; i < reversed.length; i++) {
    const line = reversed[i];
    const ts = reversedTimestamps?.[i];

    // Extract player info from any line
    const playerRe = /"([^"]+)\s+@\s+([^"]+)"/g;
    let pm;
    while ((pm = playerRe.exec(line)) !== null) {
      const name = pm[1];
      const id = pm[2];
      if (!players.has(id)) {
        players.set(id, { id, name });
      }
    }

    // Hand start
    const handStart = line.match(HAND_START_RE);
    if (handStart) {
      currentHand = {
        handNumber: parseInt(handStart[1]),
        events: [],
        startTime: ts,
      };
      currentPosition = "Pre Flop";
      continue;
    }

    // Hand end
    const handEnd = line.match(HAND_END_RE);
    if (handEnd && currentHand) {
      currentHand.endTime = ts;
      // Calculate pot from collected amounts
      hands.push(currentHand);
      currentHand = null;
      currentPosition = "Pre Flop";
      continue;
    }

    if (!currentHand) continue;

    // Player stacks
    if (STACKS_RE.test(line)) {
      const stacks: Record<string, number> = {};
      let m;
      const re = new RegExp(STACK_ENTRY_RE.source, "g");
      while ((m = re.exec(line)) !== null) {
        stacks[m[1]] = parseFloat(m[3]);
      }
      currentHand.startingStacks = stacks;
      currentHand.playerCount = Object.keys(stacks).length;
      continue;
    }

    // Flop
    const flopMatch = line.match(FLOP_RE);
    if (flopMatch) {
      currentHand.flop = parseCards(flopMatch[1]);
      currentPosition = "Post Flop";
      continue;
    }

    // Turn
    const turnMatch = line.match(TURN_RE);
    if (turnMatch) {
      currentHand.turn = turnMatch[1].trim();
      currentPosition = "Post Turn";
      continue;
    }

    // River
    const riverMatch = line.match(RIVER_RE);
    if (riverMatch) {
      currentHand.river = riverMatch[1].trim();
      currentPosition = "Post River";
      continue;
    }

    // Small blind
    const sbMatch = line.match(SMALL_BLIND_RE);
    if (sbMatch) {
      currentHand.events.push({
        playerName: sbMatch[1],
        action: "small_blind",
        amount: parseFloat(sbMatch[2]),
        position: currentPosition,
      });
      continue;
    }

    // Big blind
    const bbMatch = line.match(BIG_BLIND_RE);
    if (bbMatch) {
      currentHand.events.push({
        playerName: bbMatch[1],
        action: "big_blind",
        amount: parseFloat(bbMatch[2]),
        position: currentPosition,
      });
      continue;
    }

    // Calls
    const callMatch = line.match(CALLS_RE);
    if (callMatch) {
      currentHand.events.push({
        playerName: callMatch[1],
        action: "call",
        amount: parseFloat(callMatch[2]),
        position: currentPosition,
      });
      continue;
    }

    // Raises
    const raiseMatch = line.match(RAISES_RE);
    if (raiseMatch) {
      currentHand.events.push({
        playerName: raiseMatch[1],
        action: "raise",
        amount: parseFloat(raiseMatch[2]),
        position: currentPosition,
      });
      continue;
    }

    // Bets
    const betMatch = line.match(BETS_RE);
    if (betMatch) {
      currentHand.events.push({
        playerName: betMatch[1],
        action: "bet",
        amount: parseFloat(betMatch[2]),
        position: currentPosition,
      });
      continue;
    }

    // Folds
    const foldMatch = line.match(FOLDS_RE);
    if (foldMatch) {
      currentHand.events.push({
        playerName: foldMatch[1],
        action: "fold",
        position: currentPosition,
      });
      continue;
    }

    // Checks
    const checkMatch = line.match(CHECKS_RE);
    if (checkMatch) {
      currentHand.events.push({
        playerName: checkMatch[1],
        action: "check",
        position: currentPosition,
      });
      continue;
    }

    // Shows
    const showMatch = line.match(SHOWS_RE);
    if (showMatch) {
      currentHand.events.push({
        playerName: showMatch[1],
        action: "show",
        position: currentPosition,
        cards: parseCards(showMatch[2]),
      });
      continue;
    }

    // Collected (win)
    const collectMatch = line.match(COLLECTED_RE);
    if (collectMatch) {
      const amount = parseFloat(collectMatch[2]);
      const hand = collectMatch[3]?.trim();
      currentHand.winner = collectMatch[1];
      currentHand.winAmount = amount;
      currentHand.winHand = hand || undefined;
      currentHand.potSize = amount;
      currentHand.events.push({
        playerName: collectMatch[1],
        action: "win",
        amount,
        position: currentPosition,
      });
      continue;
    }
  }

  // Handle case where last hand wasn't closed
  if (currentHand) {
    hands.push(currentHand);
  }

  return { hands, players };
}

// Parse CSV file content (PokerNow format: entry,at,order columns)
export function parseCsvEntries(csvContent: string): { entries: string[]; timestamps: Date[] } {
  const lines = csvContent.split("\n");
  const entries: string[] = [];
  const timestamps: Date[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV format: "entry","at","order"
    // The entry field may contain commas and quotes, so we parse carefully
    let entry = "";
    let at = "";

    if (line.startsWith('"')) {
      // Find the closing quote for entry field
      let j = 1;
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') {
          entry += '"';
          j += 2;
        } else if (line[j] === '"') {
          j++; // closing quote
          break;
        } else {
          entry += line[j];
          j++;
        }
      }
      // Skip comma
      if (line[j] === ",") j++;
      // Parse remaining
      const rest = line.substring(j);
      const parts = rest.split(",");
      at = parts[0]?.replace(/"/g, "") || "";
    } else {
      // Simple split
      const parts = line.split(",");
      entry = parts[0]?.replace(/"/g, "") || "";
      at = parts[1]?.replace(/"/g, "") || "";
    }

    if (entry) {
      entries.push(entry);
      timestamps.push(at ? new Date(at) : new Date());
    }
  }

  return { entries, timestamps };
}
