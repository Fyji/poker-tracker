"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PlayerData {
  name: string;
  gamesPlayed: number;
  totalPnL: number;
  avgPnL: number;
  pnlHistory: { date: string; gameId: string; net: number; cumulative: number }[];
}

const COLORS = [
  "#34d399", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa",
  "#fb923c", "#2dd4bf", "#f472b6", "#818cf8", "#4ade80",
];

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

  const formatAmount = (n: number) => {
    const formatted = Math.abs(n).toFixed(2);
    if (n > 0) return `+₪${formatted}`;
    if (n < 0) return `-₪${formatted}`;
    return `₪${formatted}`;
  };

  // Build chart data: each game is a data point with cumulative PnL per player
  const allGames = new Map<string, Record<string, number>>();
  for (const player of players) {
    for (const h of player.pnlHistory) {
      const key = h.gameId;
      if (!allGames.has(key)) {
        allGames.set(key, { _date: new Date(h.date).getTime() } as unknown as Record<string, number>);
      }
      allGames.get(key)![player.name] = h.cumulative;
    }
  }

  // Sort by date and forward-fill missing values
  const chartData = Array.from(allGames.entries())
    .sort((a, b) => (a[1]._date as number) - (b[1]._date as number))
    .map(([, values], idx) => {
      const point: Record<string, unknown> = { game: `#${idx + 1}` };
      for (const player of players) {
        point[player.name] = values[player.name] ?? null;
      }
      return point;
    });

  // Forward-fill nulls
  for (let i = 1; i < chartData.length; i++) {
    for (const player of players) {
      if (chartData[i][player.name] === null || chartData[i][player.name] === undefined) {
        chartData[i][player.name] = chartData[i - 1][player.name];
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">👥 שחקנים</h1>

      {players.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-8">
            <p className="text-zinc-500 text-center">אין שחקנים עדיין.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* PnL Chart */}
          {chartData.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">📈 רווח/הפסד מצטבר</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ direction: "ltr" }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                      <XAxis dataKey="game" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `₪${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "8px",
                          direction: "ltr",
                        }}
                        formatter={(value) => [`₪${Number(value)?.toFixed(2)}`, undefined]}
                      />
                      <Legend />
                      {players.map((p, i) => (
                        <Line
                          key={p.name}
                          type="monotone"
                          dataKey={p.name}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
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
              <CardTitle className="text-lg">סטטיסטיקות</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400 text-right">שחקן</TableHead>
                    <TableHead className="text-zinc-400 text-right">משחקים</TableHead>
                    <TableHead className="text-zinc-400 text-right">סה״כ רוו״ה</TableHead>
                    <TableHead className="text-zinc-400 text-right">ממוצע</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p) => (
                    <TableRow key={p.name} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell>
                        <Link
                          href={`/player/${encodeURIComponent(p.name)}`}
                          className="text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>{p.gamesPlayed}</TableCell>
                      <TableCell className={`font-mono ${p.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatAmount(p.totalPnL)}
                      </TableCell>
                      <TableCell className={`font-mono ${p.avgPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatAmount(p.avgPnL)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
