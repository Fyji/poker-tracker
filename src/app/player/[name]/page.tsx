"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";

interface PlayerDetail {
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
  pnlHistory: {
    date: string;
    gameId: string;
    net: number;
    buyIn: number;
    cumulative: number;
  }[];
}

const formatAmount = (n: number) => {
  const formatted = Math.abs(n).toFixed(2);
  if (n > 0) return `+₪${formatted}`;
  if (n < 0) return `-₪${formatted}`;
  return `₪${formatted}`;
};

export default function PlayerDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${encodeURIComponent(decodedName)}`)
      .then((r) => r.json())
      .then(setPlayer)
      .finally(() => setLoading(false));
  }, [decodedName]);

  if (loading) return <p className="text-zinc-500 text-center py-12">טוען...</p>;
  if (!player) return <p className="text-red-400 text-center py-12">שחקן לא נמצא</p>;

  const cumulativeData = player.pnlHistory.map((h, i) => ({
    game: `#${i + 1}`,
    cumulative: h.cumulative,
    date: new Date(h.date).toLocaleDateString("he-IL"),
  }));

  const perGameData = player.pnlHistory.map((h, i) => ({
    game: `#${i + 1}`,
    net: h.net,
    buyIn: h.buyIn,
    date: new Date(h.date).toLocaleDateString("he-IL"),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/players" className="text-zinc-500 hover:text-zinc-300 transition">
          ← חזרה
        </Link>
        <h1 className="text-3xl font-bold text-zinc-100">{player.name}</h1>
        <Badge
          variant="outline"
          className={
            player.totalPnL > 0
              ? "border-emerald-800 text-emerald-400 text-lg px-3"
              : "border-red-800 text-red-400 text-lg px-3"
          }
        >
          {formatAmount(player.totalPnL)}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-zinc-100">{player.gamesPlayed}</p>
            <p className="text-sm text-zinc-500 mt-1">משחקים</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className={`text-3xl font-bold ${player.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {player.winRate}%
            </p>
            <p className="text-sm text-zinc-500 mt-1">Win Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className={`text-3xl font-bold ${player.avgPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatAmount(player.avgPnL)}
            </p>
            <p className="text-sm text-zinc-500 mt-1">ממוצע למשחק</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-zinc-100">₪{player.avgBuyIn.toFixed(0)}</p>
            <p className="text-sm text-zinc-500 mt-1">ממוצע Buy-in</p>
          </CardContent>
        </Card>
      </div>

      {/* More Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-emerald-400">{formatAmount(player.biggestWin)}</p>
            <p className="text-sm text-zinc-500 mt-1">🏆 Win הכי גדול</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-400">{formatAmount(player.biggestLoss)}</p>
            <p className="text-sm text-zinc-500 mt-1">💀 Loss הכי גדול</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-zinc-100">
              {player.streakType === "win" ? "🔥" : player.streakType === "loss" ? "❄️" : "➖"}{" "}
              {player.streak}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Streak {player.streakType === "win" ? "רווחים" : player.streakType === "loss" ? "הפסדים" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative PnL Chart */}
      {cumulativeData.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-200">📈 PnL מצטבר</CardTitle>
          </CardHeader>
          <CardContent>
            <div dir="ltr" className="w-full">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="game" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `₪${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`₪${Number(value)?.toFixed(2)}`, "מצטבר"]}
                    labelFormatter={(label) => {
                      const point = cumulativeData.find((d) => d.game === label);
                      return point ? point.date : label;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke={player.totalPnL >= 0 ? "#34d399" : "#f87171"}
                    strokeWidth={3}
                    dot={{ fill: "#18181b", stroke: player.totalPnL >= 0 ? "#34d399" : "#f87171", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Game Results Bar Chart */}
      {perGameData.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-200">📊 תוצאות לפי משחק</CardTitle>
          </CardHeader>
          <CardContent>
            <div dir="ltr" className="w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perGameData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="game" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `₪${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`₪${Number(value)?.toFixed(2)}`, "תוצאה"]}
                    labelFormatter={(label) => {
                      const point = perGameData.find((d) => d.game === label);
                      return point ? point.date : label;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                  <Bar
                    dataKey="net"
                    fill="#34d399"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game History Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-200">🎮 היסטוריית משחקים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 text-right">#</TableHead>
                <TableHead className="text-zinc-400 text-right">תאריך</TableHead>
                <TableHead className="text-zinc-400 text-right">Buy-in</TableHead>
                <TableHead className="text-zinc-400 text-right">תוצאה</TableHead>
                <TableHead className="text-zinc-400 text-right">מצטבר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {player.pnlHistory.map((h, i) => (
                <TableRow key={h.gameId} className="border-zinc-800">
                  <TableCell className="text-zinc-500">{i + 1}</TableCell>
                  <TableCell className="text-zinc-400">
                    {new Date(h.date).toLocaleDateString("he-IL")}
                  </TableCell>
                  <TableCell className="text-zinc-400">₪{h.buyIn.toFixed(2)}</TableCell>
                  <TableCell
                    className={`font-bold ${
                      h.net > 0 ? "text-emerald-400" : h.net < 0 ? "text-red-400" : "text-zinc-400"
                    }`}
                  >
                    {formatAmount(h.net)}
                  </TableCell>
                  <TableCell
                    className={`font-medium ${
                      h.cumulative > 0 ? "text-emerald-400" : h.cumulative < 0 ? "text-red-400" : "text-zinc-400"
                    }`}
                  >
                    {formatAmount(h.cumulative)}
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
