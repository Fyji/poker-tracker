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

interface GameDetail {
  id: string;
  pokernowId: string;
  playedAt: string;
  playerCount: number;
  totalPot: number;
  results: { playerName: string; buyIn: number; net: number }[];
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${id}`)
      .then((r) => r.json())
      .then(setGame)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-zinc-500 text-center py-12">טוען...</p>;
  if (!game) return <p className="text-red-400 text-center py-12">משחק לא נמצא</p>;

  const formatAmount = (n: number) => {
    const formatted = Math.abs(n).toFixed(2);
    if (n > 0) return `+₪${formatted}`;
    if (n < 0) return `-₪${formatted}`;
    return `₪${formatted}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/games" className="text-zinc-400 hover:text-zinc-200">
          ← חזרה
        </Link>
        <h1 className="text-2xl font-bold">🎮 פרטי משחק</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-zinc-400 text-sm">תאריך</p>
            <p className="text-lg font-medium">{new Date(game.playedAt).toLocaleDateString("he-IL")}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-zinc-400 text-sm">שחקנים</p>
            <p className="text-lg font-medium">{game.playerCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-zinc-400 text-sm">סה״כ באי-אין</p>
            <p className="text-lg font-medium font-mono">₪{game.totalPot.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">תוצאות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 text-right">שחקן</TableHead>
                <TableHead className="text-zinc-400 text-right">באי-אין</TableHead>
                <TableHead className="text-zinc-400 text-right">רווח/הפסד</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {game.results.map((r) => (
                <TableRow key={r.playerName} className="border-zinc-800">
                  <TableCell>
                    <Link
                      href={`/player/${encodeURIComponent(r.playerName)}`}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      {r.playerName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono">₪{r.buyIn.toFixed(2)}</TableCell>
                  <TableCell className={`font-mono ${r.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatAmount(r.net)}
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
