"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface GameResult {
  playerName: string;
  buyIn: number;
  net: number;
}

interface ImportResponse {
  success: boolean;
  game: { id: string; pokernowId: string; playedAt: string };
  results: GameResult[];
  debts: { fromName: string; toName: string; amount: number }[];
  error?: string;
}

interface Debt {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  paid: boolean;
}

interface PlayerSummary {
  name: string;
  totalPnL: number;
  gamesPlayed: number;
}

const formatAmount = (n: number) => {
  const formatted = Math.abs(n).toFixed(2);
  if (n > 0) return `+₪${formatted}`;
  if (n < 0) return `-₪${formatted}`;
  return `₪${formatted}`;
};

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    const res = await fetch("/api/debts");
    const data = await res.json();
    setDebts(data);
  }, []);

  const fetchPlayers = useCallback(async () => {
    const res = await fetch("/api/players");
    const data = await res.json();
    setPlayers(data);
  }, []);

  useEffect(() => {
    fetchDebts();
    fetchPlayers();
  }, [fetchDebts, fetchPlayers]);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setImportResult(null);
    try {
      const res = await fetch("/api/games/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ייבוא נכשל");
      } else {
        setImportResult(data);
        setUrl("");
        fetchDebts();
        fetchPlayers();
      }
    } catch {
      setError("שגיאה בייבוא המשחק");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (debtId: string) => {
    setPayingId(debtId);
    try {
      await fetch(`/api/debts/${debtId}/pay`, { method: "POST" });
      fetchDebts();
    } finally {
      setPayingId(null);
    }
  };

  const topEarners = [...players].sort((a, b) => b.totalPnL - a.totalPnL).slice(0, 3);
  const topLosers = [...players].sort((a, b) => a.totalPnL - b.totalPnL).slice(0, 3);
  const totalGames = players.length > 0 ? Math.max(...players.map((p) => p.gamesPlayed)) : 0;
  const totalMoneyMoved = players.reduce((sum, p) => sum + Math.abs(p.totalPnL), 0) / 2;
  const unpaidDebts = debts.filter((d) => !d.paid);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-zinc-100">{totalGames}</p>
            <p className="text-sm text-zinc-500 mt-1">משחקים</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-zinc-100">{players.length}</p>
            <p className="text-sm text-zinc-500 mt-1">שחקנים</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-zinc-100">₪{totalMoneyMoved.toFixed(0)}</p>
            <p className="text-sm text-zinc-500 mt-1">סה&quot;כ הועבר</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-zinc-100">{unpaidDebts.length}</p>
            <p className="text-sm text-zinc-500 mt-1">חובות פתוחים</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Earners & Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-emerald-400 flex items-center gap-2 text-lg">
              🏆 מרוויחים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEarners.map((p, i) => (
              <Link href={`/player/${encodeURIComponent(p.name)}`} key={p.name}>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="font-medium text-zinc-200">{p.name}</span>
                    <span className="text-xs text-zinc-500">{p.gamesPlayed} משחקים</span>
                  </div>
                  <span className="font-bold text-emerald-400">{formatAmount(p.totalPnL)}</span>
                </div>
              </Link>
            ))}
            {topEarners.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-4">אין נתונים</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
              💸 מפסידים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLosers.filter((p) => p.totalPnL < 0).map((p, i) => (
              <Link href={`/player/${encodeURIComponent(p.name)}`} key={p.name}>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{["💀", "😵", "😢"][i]}</span>
                    <span className="font-medium text-zinc-200">{p.name}</span>
                    <span className="text-xs text-zinc-500">{p.gamesPlayed} משחקים</span>
                  </div>
                  <span className="font-bold text-red-400">{formatAmount(p.totalPnL)}</span>
                </div>
              </Link>
            ))}
            {topLosers.filter((p) => p.totalPnL < 0).length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-4">אין נתונים</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Game */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-200">🃏 הוסף משחק</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="הדבק לינק PokerNow..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-right"
              dir="ltr"
            />
            <Button
              onClick={handleImport}
              disabled={loading || !url.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
            >
              {loading ? "טוען..." : "ייבא"}
            </Button>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && importResult.success && (
        <Card className="bg-zinc-900 border-emerald-800/50">
          <CardHeader>
            <CardTitle className="text-emerald-400">✅ משחק יובא בהצלחה</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 text-right">שחקן</TableHead>
                  <TableHead className="text-zinc-400 text-right">Buy-in</TableHead>
                  <TableHead className="text-zinc-400 text-right">תוצאה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResult.results.sort((a, b) => b.net - a.net).map((r) => (
                  <TableRow key={r.playerName} className="border-zinc-800">
                    <TableCell className="font-medium text-zinc-200">{r.playerName}</TableCell>
                    <TableCell className="text-zinc-400">₪{r.buyIn.toFixed(2)}</TableCell>
                    <TableCell className={r.net > 0 ? "text-emerald-400 font-bold" : r.net < 0 ? "text-red-400 font-bold" : "text-zinc-400"}>
                      {formatAmount(r.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Current Debts */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-200">💰 חובות פתוחים</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidDebts.length === 0 ? (
            <p className="text-zinc-500 text-center py-6">אין חובות פתוחים 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 text-right">חייב</TableHead>
                  <TableHead className="text-zinc-400 text-right">ל-</TableHead>
                  <TableHead className="text-zinc-400 text-right">סכום</TableHead>
                  <TableHead className="text-zinc-400 text-right">פעולה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidDebts.map((d) => (
                  <TableRow key={d.id} className="border-zinc-800">
                    <TableCell className="font-medium text-red-400">{d.fromName}</TableCell>
                    <TableCell className="font-medium text-emerald-400">{d.toName}</TableCell>
                    <TableCell className="font-bold text-zinc-200">₪{d.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(d.id)}
                        disabled={payingId === d.id}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400"
                      >
                        {payingId === d.id ? "..." : "✅ שולם"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paid Debts */}
      {debts.filter((d) => d.paid).length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-500 text-base">חובות ששולמו</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-500 text-right">חייב</TableHead>
                  <TableHead className="text-zinc-500 text-right">ל-</TableHead>
                  <TableHead className="text-zinc-500 text-right">סכום</TableHead>
                  <TableHead className="text-zinc-500 text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.filter((d) => d.paid).map((d) => (
                  <TableRow key={d.id} className="border-zinc-800 opacity-50">
                    <TableCell className="text-zinc-500">{d.fromName}</TableCell>
                    <TableCell className="text-zinc-500">{d.toName}</TableCell>
                    <TableCell className="text-zinc-500">₪{d.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-800 text-emerald-500">שולם</Badge>
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
