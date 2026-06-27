"use client";

import { useState, useEffect, use } from "react";
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
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PlayerDetail {
  name: string;
  gamesPlayed: number;
  totalPnL: number;
  avgPnL: number;
  pnlHistory: {
    date: string;
    gameId: string;
    net: number;
    buyIn: number;
    cumulative: number;
  }[];
}

export default function PlayerDetailPage({ params }: { params: Promise<{ name: string }> }) {
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

  const formatAmount = (n: number) => {
    const formatted = Math.abs(n).toFixed(2);
    if (n > 0) return `+₪${formatted}`;
    if (n < 0) return `-₪${formatted}`;
    return `₪${formatted}`;
  };

  const chartData = player.pnlHistory.map((h, i) => ({
    game: `#${i + 1}`,
    net: h.net,
    cumulative: h.cumulative,
    date: new Date(h.date).toLocaleDateString("he-IL"),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/players" className="text-zinc-400 hover:text-zinc-200">
          ← חזרה
        </Link>
        <h1 className="text-2xl font-bold">👤 {player.name}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-zinc-400 text-sm">משחקים</p>
            <p className="text-2xl font-bold">{player.gamesPlayed}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-zinc-400 text-sm">סה״כ רוו״ה</p>
            <p className={`text-2xl font-bold font-mono ${player.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatAmount(player.totalPnL)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-zinc-400 text-sm">ממוצע למשחק</p>
            <p className={`text-2xl font-bold font-mono ${player.avgPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatAmount(player.avgPnL)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PnL Chart */}
      {chartData.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">📈 רווח/הפסד מצטבר</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ direction: "ltr" }}>
              <ResponsiveContainer width="100%" height={300}>
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
                    formatter={(value, name) => [
                      `₪${Number(value)?.toFixed(2)}`,
                      name === "cumulative" ? "מצטבר" : "נטו",
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#34d399" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#60a5fa"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">📋 היסטוריית משחקים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 text-right">#</TableHead>
                <TableHead className="text-zinc-400 text-right">תאריך</TableHead>
                <TableHead className="text-zinc-400 text-right">באי-אין</TableHead>
                <TableHead className="text-zinc-400 text-right">רוו״ה</TableHead>
                <TableHead className="text-zinc-400 text-right">מצטבר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {player.pnlHistory.map((h, i) => (
                <TableRow key={h.gameId} className="border-zinc-800">
                  <TableCell className="text-zinc-500">{i + 1}</TableCell>
                  <TableCell>{new Date(h.date).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell className="font-mono">₪{h.buyIn.toFixed(2)}</TableCell>
                  <TableCell className={`font-mono ${h.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatAmount(h.net)}
                  </TableCell>
                  <TableCell className={`font-mono ${h.cumulative >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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
