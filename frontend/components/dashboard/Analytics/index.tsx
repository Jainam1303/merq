"use client";
import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import { TrendingUp, TrendingDown, Target, Activity, Trophy, AlertTriangle, ArrowDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { toast } from "sonner";

export function Analytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const res = await fetchJson('/analytics');
                console.log('[Analytics] Received data:', res);

                // Check if response has error status
                if (res.status === 'error') {
                    throw new Error(res.message || 'Failed to load analytics');
                }

                setData(res);
                setError(null);
            } catch (e: any) {
                console.error('[Analytics] Error:', e);
                const errorMsg = e.message || 'Failed to load analytics';
                setError(errorMsg);
                toast.error(errorMsg);
            } finally {
                setLoading(false);
            }
        };
        loadAnalytics();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    if (error) {
        return (
            <div className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">Unable to Load Analytics</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground mt-4">Make sure you have completed some trades to see analytics.</p>
            </div>
        );
    }

    if (!data || data.total_trades === 0) {
        return (
            <div className="p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">No Trading Data Yet</p>
                <p className="text-sm text-muted-foreground">Complete some trades to see your performance analytics here.</p>
            </div>
        );
    }

    const winLossData = [
        { name: 'Winning', value: data.winning_trades, color: '#22c55e' }, // green-500
        { name: 'Losing', value: data.losing_trades, color: '#ef4444' }, // red-500
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Trades</p>
                            <p className="text-2xl font-bold">{data.total_trades}</p>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-primary/10 text-primary">
                            <Activity className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Win Rate</p>
                            <p className="text-2xl font-bold text-green-500">{data.win_rate.toFixed(1)}%</p>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-green-500/10 text-green-500">
                            <Target className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Profit/Trade</p>
                            <p className={`text-2xl font-bold ${data.avg_profit_per_trade >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ₹{data.avg_profit_per_trade.toFixed(0)}
                            </p>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-blue-500/10 text-blue-500">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Profit Factor</p>
                            <p className="text-2xl font-bold">{data.profit_factor.toFixed(2)}</p>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-orange-500/10 text-orange-500">
                            <Activity className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Highlights */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-green-500/10 text-green-500">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Best Day</p>
                            <p className="font-bold text-green-500 text-lg">+₹{data.best_day.pnl.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{data.best_day.date || 'N/A'}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-red-500/10 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Worst Day</p>
                            <p className="font-bold text-red-500 text-lg">₹{data.worst_day.pnl.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{data.worst_day.date || 'N/A'}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded bg-yellow-500/10 text-yellow-500">
                            <ArrowDown className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Max Drawdown</p>
                            <p className="font-bold text-yellow-500 text-lg">{data.max_drawdown}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Daily P&L (Last 7 Days)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.daily_pnl || []}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    />
                                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                        {data.daily_pnl?.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Win/Loss Distribution</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={winLossData}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {winLossData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold">{data.win_rate.toFixed(0)}%</span>
                                <span className="text-xs text-muted-foreground">Win Rate</span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500" />
                                <span className="text-sm text-muted-foreground">Winning ({data.winning_trades})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-500" />
                                <span className="text-sm text-muted-foreground">Losing ({data.losing_trades})</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
