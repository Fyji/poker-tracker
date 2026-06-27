"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    const res = await fetch("/api/debts");
    const data = await res.json();
    setDebts(data);
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

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
        setError(data.error || "Import failed");
      } else {
        setImportResult(data);
        setUrl("");
        fetchDebts();
      }
    } catch {
      setError("Failed to connect to server");
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

  const formatAmount = (n: number) => {
    const formatted = Math.abs(n).toFixed(2);
    if (n > 0) return `+₪${formatted}`;
    if (n < 0) return `-₪${formatted}`;
    return `₪${formatted}`;
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">🎯 הוסף משחק</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="הדבק לינק של PokerNow..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              dir="ltr"
            />
            <Button
              onClick={handleImport}
              disabled={loading || !url.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[100px]"
            >
              {loading ? "טוען..." : "ייבא"}
            </Button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && (
        <Card className="bg-zinc-900 border-emerald-800/50">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-400">✅ משחק יובא בהצלחה</CardTitle>
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
                {importResult.results.map((r) => (
                  <TableRow key={r.playerName} className="border-zinc-800">
                    <TableCell className="font-medium">{r.playerName}</TableCell>
                    <TableCell>₪{r.buyIn.toFixed(2)}</TableCell>
                    <TableCell className={r.net >= 0 ? "text-emerald-400" : "text-red-400"}>
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
          <CardTitle className="text-lg">💰 חובות פתוחים</CardTitle>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <p className="text-zinc-500 text-center py-4">אין חובות פתוחים 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 text-right">מ</TableHead>
                  <TableHead className="text-zinc-400 text-right">ל</TableHead>
                  <TableHead className="text-zinc-400 text-right">סכום</TableHead>
                  <TableHead className="text-zinc-400 text-right">סטטוס</TableHead>
                  <TableHead className="text-zinc-400 text-right">פעולה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((d) => (
                  <TableRow key={d.id} className="border-zinc-800">
                    <TableCell className="font-medium">{d.fromName}</TableCell>
                    <TableCell className="font-medium">{d.toName}</TableCell>
                    <TableCell className="text-amber-400 font-mono">₪{d.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-amber-600 text-amber-400">
                        ממתין
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(d.id)}
                        disabled={payingId === d.id}
                        className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/50"
                      >
                        {payingId === d.id ? "..." : "שולם ✓"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
