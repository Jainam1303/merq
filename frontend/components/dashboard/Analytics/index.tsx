"use client";
import { useState, useEffect, useRef } from "react";
import { fetchJson } from "@/lib/api";
import { TrendingUp, TrendingDown, Target, Activity, Trophy, AlertTriangle, ArrowDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { toast } from "sonner";

import { format, subDays, eachDayOfInterval } from "date-fns";

export function Analytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timePeriod, setTimePeriod] = useState<'7D' | '30D' | '90D'>('7D');

    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const res = await fetchJson('/analytics');

                // Check if response has error status
                if (res.status === 'error') {
                    console.warn('[Analytics] API reported error:', res.message);
                    if (!hasLoadedRef.current) {
                        setError(res.message || 'Failed to load analytics');
                    }
                    return;
                }

                setData(res);
                setError(null);
                hasLoadedRef.current = true;
            } catch (e: any) {
                console.error('[Analytics] Error:', e);
                // Only show error screen if we haven't loaded data yet
                if (!hasLoadedRef.current) {
                    const errorMsg = e.message || 'Failed to load analytics';
                    setError(errorMsg);
                }
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
        const interval = setInterval(loadAnalytics, 5000); // 5s Polling

        return () => clearInterval(interval);
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

    // Safely extract data with fallbacks
    const totalTrades = data.total_trades ?? 0;
    const winRate = data.win_rate ?? 0;
    const avgProfitPerTrade = data.avg_profit_per_trade ?? 0;
    const profitFactor = data.profit_factor ?? 0;
    const winningTrades = data.winning_trades ?? 0;
    const losingTrades = data.losing_trades ?? 0;
    const bestDay = data.best_day ?? { pnl: 0, date: 'N/A' };
    const worstDay = data.worst_day ?? { pnl: 0, date: 'N/A' };
    const maxDrawdown = data.max_drawdown ?? 0;
    const dailyPnl = data.daily_pnl ?? [];

    // Filter & Fill data based on time period
    const getDaysCount = () => {
        switch (timePeriod) {
            case '7D': return 7;
            case '30D': return 30;
            case '90D': return 90;
            default: return 7;
        }
    };

    const daysCount = getDaysCount();
    const today = new Date();
    const startDate = subDays(today, daysCount - 1);

    // Generate full date range
    const filteredDailyPnl = eachDayOfInterval({ start: startDate, end: today }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        // Find if this date exists in data
        const found = dailyPnl.find((d: any) => d.day === dateStr);
        return {
            day: format(date, 'MMM dd'),
            pnl: found ? found.pnl : 0
        };
    });

    const winLossData = [
        { name: 'Winning', value: winningTrades, color: '#22c55e' }, // green-500
        { name: 'Losing', value: losingTrades, color: '#ef4444' }, // red-500
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Trades</p>
                            <p className="text-2xl font-bold">{totalTrades}</p>
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
                            <p className="text-2xl font-bold text-green-500">{parseFloat(String(winRate ?? 0)).toFixed(1)}%</p>
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
                            <p className={`text-2xl font-bold ${avgProfitPerTrade >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ₹{parseFloat(String(avgProfitPerTrade ?? 0)).toFixed(0)}
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
                            <p className="text-2xl font-bold">{parseFloat(String(profitFactor ?? 0)).toFixed(2)}</p>
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
                            <p className="font-bold text-green-500 text-lg">+₹{(bestDay.pnl ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{bestDay.date || 'N/A'}</p>
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
                            <p className="font-bold text-red-500 text-lg">₹{(worstDay.pnl ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{worstDay.date || 'N/A'}</p>
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
                            <p className="font-bold text-yellow-500 text-lg">{maxDrawdown}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>P&L Trend (Last {getDaysCount()} Days)</CardTitle>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTimePeriod('7D')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timePeriod === '7D'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                7D
                            </button>
                            <button
                                onClick={() => setTimePeriod('30D')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timePeriod === '30D'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                30D
                            </button>
                            <button
                                onClick={() => setTimePeriod('90D')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timePeriod === '90D'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                90D
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredDailyPnl}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    />
                                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                        {filteredDailyPnl.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={(entry.pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />
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
                                <span className="text-3xl font-bold">{parseFloat(String(winRate ?? 0)).toFixed(0)}%</span>
                                <span className="text-xs text-muted-foreground">Win Rate</span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500" />
                                <span className="text-sm text-muted-foreground">Winning ({winningTrades})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-500" />
                                <span className="text-sm text-muted-foreground">Losing ({losingTrades})</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PnL Heatmap */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        PnL Heatmap (Last 90 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(() => {
                        // Build 90-day heatmap data
                        const heatmapDays = 90;
                        const heatmapEnd = new Date();
                        const heatmapStart = subDays(heatmapEnd, heatmapDays - 1);
                        const allDays = eachDayOfInterval({ start: heatmapStart, end: heatmapEnd });

                        // Map daily PnL lookup
                        const pnlMap = new Map<string, number>();
                        (dailyPnl || []).forEach((d: any) => {
                            pnlMap.set(d.day, d.pnl);
                        });

                        // Find max absolute PnL for color scaling
                        const pnlValues = allDays.map(d => pnlMap.get(format(d, 'yyyy-MM-dd')) ?? 0);
                        const maxAbsPnl = Math.max(...pnlValues.map(Math.abs), 1);

                        // Get color for a PnL value
                        const getColor = (pnl: number) => {
                            if (pnl === 0) return 'bg-muted/40';
                            const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
                            if (pnl > 0) {
                                if (intensity > 0.75) return 'bg-green-500';
                                if (intensity > 0.5) return 'bg-green-400';
                                if (intensity > 0.25) return 'bg-green-300 dark:bg-green-600/70';
                                return 'bg-green-200 dark:bg-green-700/50';
                            } else {
                                if (intensity > 0.75) return 'bg-red-500';
                                if (intensity > 0.5) return 'bg-red-400';
                                if (intensity > 0.25) return 'bg-red-300 dark:bg-red-600/70';
                                return 'bg-red-200 dark:bg-red-700/50';
                            }
                        };

                        // Group days into weeks (columns)
                        const weeks: Date[][] = [];
                        let currentWeek: Date[] = [];

                        // Pad the first week to start on Sunday
                        const startDow = allDays[0].getDay();
                        for (let i = 0; i < startDow; i++) {
                            currentWeek.push(null as any); // empty padding
                        }

                        allDays.forEach(day => {
                            if (day.getDay() === 0 && currentWeek.length > 0) {
                                weeks.push(currentWeek);
                                currentWeek = [];
                            }
                            currentWeek.push(day);
                        });
                        if (currentWeek.length > 0) {
                            // Pad the last week
                            while (currentWeek.length < 7) {
                                currentWeek.push(null as any);
                            }
                            weeks.push(currentWeek);
                        }

                        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                        return (
                            <div>
                                <div className="flex gap-[2px]">
                                    {/* Day labels */}
                                    <div className="flex flex-col gap-[2px] mr-2 pt-5">
                                        {dayLabels.map((label, i) => (
                                            <div key={label} className="h-[14px] flex items-center">
                                                {i % 2 === 1 ? (
                                                    <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Weeks grid */}
                                    <div className="flex gap-[2px] overflow-x-auto flex-1">
                                        {weeks.map((week, wi) => (
                                            <div key={wi} className="flex flex-col gap-[2px]">
                                                {/* Month label on first week of month */}
                                                <div className="h-4 flex items-end">
                                                    {(() => {
                                                        // Show month label if first day of this week is different month than previous
                                                        const firstReal = week.find(d => d !== null);
                                                        if (!firstReal) return null;
                                                        const prevWeek = wi > 0 ? weeks[wi - 1] : null;
                                                        const prevFirstReal = prevWeek?.find(d => d !== null);
                                                        if (!prevFirstReal || firstReal.getMonth() !== prevFirstReal.getMonth()) {
                                                            return <span className="text-[10px] text-muted-foreground leading-none">{format(firstReal, 'MMM')}</span>;
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                                {week.map((day, di) => {
                                                    if (!day) {
                                                        return <div key={`empty-${di}`} className="w-[14px] h-[14px]" />;
                                                    }
                                                    const dateKey = format(day, 'yyyy-MM-dd');
                                                    const pnl = pnlMap.get(dateKey) ?? 0;
                                                    const colorClass = getColor(pnl);
                                                    return (
                                                        <div
                                                            key={dateKey}
                                                            className={`w-[14px] h-[14px] rounded-[3px] ${colorClass} transition-all hover:ring-2 hover:ring-primary/50 hover:scale-125 cursor-pointer relative group`}
                                                            title={`${format(day, 'dd MMM yyyy')}: ₹${pnl.toLocaleString('en-IN')}`}
                                                        >
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                                                <div className="bg-popover text-popover-foreground border border-border rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                                                                    <p className="font-medium">{format(day, 'dd MMM yyyy')}</p>
                                                                    <p className={pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                                                                        {pnl === 0 ? 'No trades' : `₹${pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex items-center justify-end gap-2 mt-4">
                                    <span className="text-xs text-muted-foreground">Loss</span>
                                    <div className="flex gap-[2px]">
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-red-500" />
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-red-400" />
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-red-200 dark:bg-red-700/50" />
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-muted/40" />
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-green-200 dark:bg-green-700/50" />
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-green-400" />
                                        <div className="w-[12px] h-[12px] rounded-[2px] bg-green-500" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">Profit</span>
                                </div>
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>
        </div>
    );
}

