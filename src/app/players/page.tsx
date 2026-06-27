"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PlayerData {
  name: string;
  gamesPlayed: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  avgBuyIn: number;
  streak: number;
  streakType: "win" | "loss" | "none";
  pnlHistory: { date: string; gameId: string; net: number; cumulative: number }[];
}

const COLORS = [
  "#34d399", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa",
  "#fb923c", "#2dd4bf", "#f472b6", "#818cf8", "#4ade80",
];

const formatAmount = (n: number) => {
  const formatted = Math.abs(n).toFixed(2);
  if (n > 0) return `+₪${formatted}`;
  if (n < 0) return `-₪${formatted}`;
  return `₪${formatted}`;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-zinc-500 text-center py-12">טוען...</p>;

  // Build combined chart data
  const allGames = new Map<string, Record<string, number>>();
  for (const player of players) {
    for (const h of player.pnlHistory) {
      const key = h.gameId;
      if (!allGames.has(key)) {
        allGames.set(key, { _date: new Date(h.date).getTime() } as Record<string, number>);
      }
      allGames.get(key)![player.name] = h.cumulative;
    }
  }

  const chartData = Array.from(allGames.entries())
    .sort((a, b) => (a[1]._date as number) - (b[1]._date as number))
    .map(([, data], i) => {
      const point: Record<string, number | string> = { game: `#${i + 1}` };
      for (const player of players) {
        point[player.name] = data[player.name] ?? null as unknown as number;
      }
      return point;
    });

  // Fill forward null values
  for (const player of players) {
    let last: number | null = null;
    for (const point of chartData) {
      if (point[player.name] != null) {
        last = point[player.name] as number;
      } else if (last != null) {
        point[player.name] = last;
      }
    }
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">👥 שחקנים</h1>

      {/* Combined PnL Chart */}
      {chartData.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-200">📈 PnL מצטבר</CardTitle>
          </CardHeader>
          <CardContent>
            <div dir="ltr" className="w-full">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="game" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `₪${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      direction: "rtl",
                    }}
                    formatter={(value) => [`₪${Number(value)?.toFixed(2)}`, ""]}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                  {players.map((p, i) => (
                    <Line
                      key={p.name}
                      type="monotone"
                      dataKey={p.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-200">📊 טבלת דירוג</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 text-right w-12">#</TableHead>
                <TableHead className="text-zinc-400 text-right">שחקן</TableHead>
                <TableHead className="text-zinc-400 text-right">משחקים</TableHead>
                <TableHead className="text-zinc-400 text-right">Win Rate</TableHead>
                <TableHead className="text-zinc-400 text-right">סה&quot;כ PnL</TableHead>
                <TableHead className="text-zinc-400 text-right">ממוצע</TableHead>
                <TableHead className="text-zinc-400 text-right">Win גדול</TableHead>
                <TableHead className="text-zinc-400 text-right">Loss גדול</TableHead>
                <TableHead className="text-zinc-400 text-right">Streak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p, i) => (
                <TableRow key={p.name} className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer">
                  <TableCell className="text-zinc-500">
                    {i < 3 ? medals[i] : i + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/player/${encodeURIComponent(p.name)}`}
                      className="font-bold text-zinc-200 hover:text-emerald-400 transition"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{p.gamesPlayed}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        p.winRate >= 50
                          ? "border-emerald-800 text-emerald-400"
                          : "border-red-800 text-red-400"
                      }
                    >
                      {p.winRate}%
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`font-bold ${
                      p.totalPnL > 0 ? "text-emerald-400" : p.totalPnL < 0 ? "text-red-400" : "text-zinc-400"
                    }`}
                  >
                    {formatAmount(p.totalPnL)}
                  </TableCell>
                  <TableCell
                    className={
                      p.avgPnL > 0 ? "text-emerald-400" : p.avgPnL < 0 ? "text-red-400" : "text-zinc-400"
                    }
                  >
                    {formatAmount(p.avgPnL)}
                  </TableCell>
                  <TableCell className="text-emerald-400">{formatAmount(p.biggestWin)}</TableCell>
                  <TableCell className="text-red-400">{formatAmount(p.biggestLoss)}</TableCell>
                  <TableCell>
                    {p.streak > 0 && p.streakType !== "none" && (
                      <Badge
                        variant="outline"
                        className={
                          p.streakType === "win"
                            ? "border-emerald-800 text-emerald-400"
                            : "border-red-800 text-red-400"
                        }
                      >
                        {p.streakType === "win" ? "🔥" : "❄️"} {p.streak}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
