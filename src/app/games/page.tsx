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

interface Game {
  id: string;
  pokernowId: string;
  playedAt: string;
  playerCount: number;
  totalPot: number;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then(setGames)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-zinc-500 text-center py-12">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎮 משחקים</h1>

      {games.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-8">
            <p className="text-zinc-500 text-center">
              אין משחקים עדיין. ייבא משחק מהדשבורד!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">{games.length} משחקים</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 text-right">תאריך</TableHead>
                  <TableHead className="text-zinc-400 text-right">שחקנים</TableHead>
                  <TableHead className="text-zinc-400 text-right">סה״כ באי-אין</TableHead>
                  <TableHead className="text-zinc-400 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((g) => (
                  <TableRow key={g.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      {new Date(g.playedAt).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell>{g.playerCount}</TableCell>
                    <TableCell className="font-mono">₪{g.totalPot.toFixed(2)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/games/${g.id}`}
                        className="text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        פרטים →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
