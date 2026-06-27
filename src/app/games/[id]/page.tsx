"use client";

import React, { useState, useEffect, use, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GameResult {
  playerName: string;
  buyIn: number;
  net: number;
}

interface PlayerAnalytics {
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

interface HeadToHead {
  calls: { count: number; avgAmount: number };
  raises: { count: number; avgAmount: number };
  folds: number;
}

interface AnalysisData {
  hasLogs: boolean;
  csvUploaded: boolean;
  totalHands: number | null;
  game: { id: string; pokernowId: string; playedAt: string };
  results: GameResult[];
  analytics?: {
    summary: { totalHands: number; avgPotSize: number; biggestPot: number; duration?: number };
    playerStats: Record<string, PlayerAnalytics>;
    headToHead: Record<string, Record<string, HeadToHead>>;
    potSizes: { hand: number; pot: number }[];
    actionDistribution: Record<string, Record<string, number>>;
    winningHandTypes: Record<string, number>;
  };
}

const COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/games/${id}/analysis`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/games/${id}/upload-csv`, { method: "POST", body: formData });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-zinc-500 text-center py-12">טוען...</p>;
  if (!data) return <p className="text-red-400 text-center py-12">משחק לא נמצא</p>;

  const { results, analytics } = data;
  const totalPot = results.reduce((sum, r) => sum + r.buyIn, 0);

  const formatAmount = (n: number) => {
    const formatted = Math.abs(n).toFixed(2);
    if (n > 0) return `+₪${formatted}`;
    if (n < 0) return `-₪${formatted}`;
    return `₪${formatted}`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}ש׳ ${m}ד׳`;
    return `${m} דקות`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/games" className="text-zinc-400 hover:text-zinc-200">← חזרה</Link>
        <h1 className="text-2xl font-bold">🎮 ניתוח משחק</h1>
        {data.csvUploaded && <Badge className="bg-emerald-900 text-emerald-300 border-emerald-700">CSV מלא</Badge>}
        {!data.csvUploaded && data.hasLogs && <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700">חלקי (API)</Badge>}
      </div>

      <Tabs defaultValue="summary" dir="rtl">
        <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start">
          <TabsTrigger value="summary">סיכום</TabsTrigger>
          {analytics && <TabsTrigger value="players">שחקנים</TabsTrigger>}
          {analytics && <TabsTrigger value="charts">גרפים</TabsTrigger>}
          {analytics && <TabsTrigger value="h2h">Head to Head</TabsTrigger>}
          {analytics && <TabsTrigger value="cards">קלפים</TabsTrigger>}
        </TabsList>

        {/* Tab 1: Summary */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <p className="text-zinc-400 text-sm">תאריך</p>
                <p className="text-lg font-medium">{new Date(data.game.playedAt).toLocaleDateString("he-IL")}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <p className="text-zinc-400 text-sm">שחקנים</p>
                <p className="text-lg font-medium">{results.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 text-center">
                <p className="text-zinc-400 text-sm">סה״כ באי-אין</p>
                <p className="text-lg font-medium font-mono">₪{totalPot.toFixed(2)}</p>
              </CardContent>
            </Card>
            {analytics && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6 text-center">
                  <p className="text-zinc-400 text-sm">ידיים</p>
                  <p className="text-lg font-medium">{analytics.summary.totalHands}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6 text-center">
                  <p className="text-zinc-400 text-sm">פוט ממוצע</p>
                  <p className="text-lg font-medium font-mono">₪{analytics.summary.avgPotSize.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6 text-center">
                  <p className="text-zinc-400 text-sm">פוט הכי גדול</p>
                  <p className="text-lg font-medium font-mono text-amber-400">₪{analytics.summary.biggestPot.toFixed(2)}</p>
                </CardContent>
              </Card>
              {analytics.summary.duration && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="pt-6 text-center">
                    <p className="text-zinc-400 text-sm">משך</p>
                    <p className="text-lg font-medium">{formatDuration(analytics.summary.duration)}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Results table */}
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
                  {results.map((r) => (
                    <TableRow key={r.playerName} className="border-zinc-800">
                      <TableCell>
                        <Link href={`/player/${encodeURIComponent(r.playerName)}`} className="text-emerald-400 hover:text-emerald-300">
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

          {/* CSV Upload prompt */}
          {!data.csvUploaded && (
            <Card className="bg-zinc-900 border-zinc-800 border-dashed">
              <CardContent className="py-8 text-center space-y-4">
                <p className="text-zinc-400">📊 העלה קובץ CSV לניתוח מעמיק</p>
                <p className="text-zinc-500 text-sm">הורד את הלוג מ-PokerNow ← Settings ← Export Log</p>
                <label>
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  <Button asChild variant="outline" className="border-emerald-700 text-emerald-400 hover:bg-emerald-950 cursor-pointer" disabled={uploading}>
                    <span>{uploading ? "מעלה..." : "📁 בחר קובץ CSV"}</span>
                  </Button>
                </label>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Player Stats */}
        {analytics && (
          <TabsContent value="players" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">סטטיסטיקות שחקנים</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400 text-right">שחקן</TableHead>
                      <TableHead className="text-zinc-400 text-right">ידיים</TableHead>
                      <TableHead className="text-zinc-400 text-right">Win%</TableHead>
                      <TableHead className="text-zinc-400 text-right">VPIP</TableHead>
                      <TableHead className="text-zinc-400 text-right">PFR</TableHead>
                      <TableHead className="text-zinc-400 text-right">AF</TableHead>
                      <TableHead className="text-zinc-400 text-right">Fold%</TableHead>
                      <TableHead className="text-zinc-400 text-right">ממוצע הימור</TableHead>
                      <TableHead className="text-zinc-400 text-right">Win גדול</TableHead>
                      <TableHead className="text-zinc-400 text-right">סטריק</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(analytics.playerStats)
                      .sort(([, a], [, b]) => b.winRate - a.winRate)
                      .map(([name, stats]) => (
                        <React.Fragment key={name}>
                          <TableRow
                            key={name}
                            className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                            onClick={() => setExpandedPlayer(expandedPlayer === name ? null : name)}
                          >
                            <TableCell className="text-emerald-400 font-medium">{name}</TableCell>
                            <TableCell className="font-mono">{stats.handsPlayed}</TableCell>
                            <TableCell className="font-mono">{stats.winRate.toFixed(1)}%</TableCell>
                            <TableCell className="font-mono">{stats.vpip.toFixed(1)}%</TableCell>
                            <TableCell className="font-mono">{stats.pfr.toFixed(1)}%</TableCell>
                            <TableCell className="font-mono">{stats.aggressionFactor.toFixed(2)}</TableCell>
                            <TableCell className="font-mono">{stats.foldRate.toFixed(1)}%</TableCell>
                            <TableCell className="font-mono">₪{stats.avgBet.toFixed(2)}</TableCell>
                            <TableCell className="font-mono text-amber-400">₪{stats.biggestWin.toFixed(2)}</TableCell>
                            <TableCell className="font-mono text-emerald-400">🏆{stats.longestWinStreak}</TableCell>
                          </TableRow>
                          {expandedPlayer === name && (
                            <TableRow key={`${name}-detail`} className="border-zinc-800 bg-zinc-800/30">
                              <TableCell colSpan={10} className="py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-zinc-400">ידיים שנוצחו:</span>{" "}
                                    <span className="font-mono">{stats.handsWon}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">סה״כ ניצחונות:</span>{" "}
                                    <span className="font-mono text-emerald-400">₪{stats.totalWon.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">ממוצע Call:</span>{" "}
                                    <span className="font-mono">₪{stats.avgCall.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">ממוצע Raise:</span>{" "}
                                    <span className="font-mono">₪{stats.avgRaise.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">הפסד גדול:</span>{" "}
                                    <span className="font-mono text-red-400">₪{stats.biggestLoss.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">סטריק הפסדים:</span>{" "}
                                    <span className="font-mono text-red-400">💀{stats.longestLoseStreak}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">Calls:</span>{" "}
                                    <span className="font-mono">{stats.actionCounts.calls}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-400">Raises:</span>{" "}
                                    <span className="font-mono">{stats.actionCounts.raises}</span>
                                  </div>
                                  {Object.keys(stats.winningHands).length > 0 && (
                                    <div className="col-span-2 md:col-span-4">
                                      <span className="text-zinc-400">ידיים מנצחות:</span>{" "}
                                      {Object.entries(stats.winningHands).map(([hand, count]) => (
                                        <Badge key={hand} className="mr-1 bg-zinc-700 text-zinc-200">
                                          {hand}: {count}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 3: Charts */}
        {analytics && (
          <TabsContent value="charts" className="space-y-4">
            {/* Chip Flow */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">📈 מהלך צ׳יפים</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const playerNames = Object.keys(analytics.playerStats).filter(
                    (n) => analytics.playerStats[n].chipHistory.length > 0
                  );
                  if (playerNames.length === 0) return <p className="text-zinc-500 text-center py-8">אין נתונים</p>;

                  // Build combined data
                  const allHands = new Set<number>();
                  for (const name of playerNames) {
                    for (const pt of analytics.playerStats[name].chipHistory) {
                      allHands.add(pt.hand);
                    }
                  }
                  const sortedHands = Array.from(allHands).sort((a, b) => a - b);
                  const chartData = sortedHands.map((hand) => {
                    const point: Record<string, number> = { hand };
                    for (const name of playerNames) {
                      const history = analytics.playerStats[name].chipHistory;
                      const match = history.find((h) => h.hand === hand);
                      if (match) point[name] = match.chips;
                    }
                    return point;
                  });

                  return (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="hand" stroke="#666" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 8 }}
                          labelStyle={{ color: "#a1a1aa" }}
                        />
                        <Legend />
                        {playerNames.map((name, i) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Pot Size Over Time */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">💰 גודל פוט לפי יד</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.potSizes.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">אין נתונים</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.potSizes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="hand" stroke="#666" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 8 }}
                        formatter={(value) => [`₪${Number(value).toFixed(2)}`, "פוט"]}
                      />
                      <Bar dataKey="pot" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Action Distribution */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">🎯 התפלגות פעולות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(analytics.actionDistribution).map(([name, actions]) => {
                    const pieData = [
                      { name: "Calls", value: actions.calls, color: "#3b82f6" },
                      { name: "Raises", value: actions.raises, color: "#f59e0b" },
                      { name: "Bets", value: actions.bets, color: "#10b981" },
                      { name: "Folds", value: actions.folds, color: "#ef4444" },
                      { name: "Checks", value: actions.checks, color: "#8b5cf6" },
                    ].filter((d) => d.value > 0);

                    return (
                      <div key={name} className="text-center">
                        <p className="text-sm font-medium text-zinc-300 mb-2">{name}</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              dataKey="value"
                              label={({ name: n, percent }) => `${n} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 8 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 4: Head to Head */}
        {analytics && (
          <TabsContent value="h2h" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">🤝 Head to Head</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {(() => {
                  const players = Object.keys(analytics.headToHead);
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800">
                          <TableHead className="text-zinc-400 text-right">שחקן</TableHead>
                          <TableHead className="text-zinc-400 text-right">נגד</TableHead>
                          <TableHead className="text-zinc-400 text-right">Calls</TableHead>
                          <TableHead className="text-zinc-400 text-right">Avg Call</TableHead>
                          <TableHead className="text-zinc-400 text-right">Raises</TableHead>
                          <TableHead className="text-zinc-400 text-right">Avg Raise</TableHead>
                          <TableHead className="text-zinc-400 text-right">Folds</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {players.flatMap((p1) =>
                          Object.entries(analytics.headToHead[p1]).map(([p2, h2h]) => (
                            <TableRow key={`${p1}-${p2}`} className="border-zinc-800">
                              <TableCell className="text-emerald-400">{p1}</TableCell>
                              <TableCell className="text-zinc-300">{p2}</TableCell>
                              <TableCell className="font-mono">{h2h.calls.count}</TableCell>
                              <TableCell className="font-mono">₪{h2h.calls.avgAmount.toFixed(2)}</TableCell>
                              <TableCell className="font-mono">{h2h.raises.count}</TableCell>
                              <TableCell className="font-mono">₪{h2h.raises.avgAmount.toFixed(2)}</TableCell>
                              <TableCell className="font-mono text-red-400">{h2h.folds}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab 5: Cards */}
        {analytics && (
          <TabsContent value="cards" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">🃏 התפלגות ידיים מנצחות</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.winningHandTypes).length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">אין נתוני ידיים מנצחות</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(analytics.winningHandTypes)
                        .sort(([, a], [, b]) => b - a)
                        .map(([name, count]) => ({ name, count }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" stroke="#666" />
                      <YAxis type="category" dataKey="name" stroke="#666" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 8 }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Per-player winning hands */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">ידיים מנצחות לפי שחקן</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.playerStats)
                    .filter(([, stats]) => Object.keys(stats.winningHands).length > 0)
                    .map(([name, stats]) => (
                      <div key={name} className="flex flex-wrap items-center gap-2">
                        <span className="text-emerald-400 min-w-[100px]">{name}:</span>
                        {Object.entries(stats.winningHands)
                          .sort(([, a], [, b]) => b - a)
                          .map(([hand, count]) => (
                            <Badge key={hand} className="bg-zinc-700 text-zinc-200">
                              {hand} ×{count}
                            </Badge>
                          ))}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
