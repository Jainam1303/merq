"use client";
import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Target, Award, AlertTriangle, Activity, Trophy, ArrowDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson } from '@/lib/api';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface MobileAnalyticsViewProps {
    pnl?: number;
    winRate?: number;
    totalTrades?: number;
    profitableTrades?: number;
    losingTrades?: number;
}

export function MobileAnalyticsView({
    pnl: propPnl = 0,
    winRate: propWinRate = 0,
    totalTrades: propTotalTrades = 0,
    profitableTrades: propProfitableTrades = 0,
    losingTrades: propLosingTrades = 0
}: MobileAnalyticsViewProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timePeriod, setTimePeriod] = useState<'7D' | '30D' | '90D'>('7D');
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const res = await fetchJson('/analytics');

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
                if (!hasLoadedRef.current) {
                    const errorMsg = e.message || 'Failed to load analytics';
                    setError(errorMsg);
                }
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
        const interval = setInterval(loadAnalytics, 5000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-180px)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[calc(100vh-180px)] p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Unable to Load Analytics</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
                <p className="text-xs text-zinc-500 mt-4">Make sure you have completed some trades to see analytics.</p>
            </div>
        );
    }

    if (!data || data.total_trades === 0) {
        return (
            <div className="min-h-[calc(100vh-180px)] p-8 text-center">
                <Activity className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No Trading Data Yet</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Complete some trades to see your performance analytics here.</p>
            </div>
        );
    }

    // Extract data with fallbacks
    const totalTrades = data.total_trades ?? propTotalTrades;
    const winRate = data.win_rate ?? propWinRate;
    const avgProfitPerTrade = data.avg_profit_per_trade ?? 0;
    const profitFactor = data.profit_factor ?? 0;
    const winningTrades = data.winning_trades ?? propProfitableTrades;
    const losingTrades = data.losing_trades ?? propLosingTrades;
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

    const filteredDailyPnl = eachDayOfInterval({ start: startDate, end: today }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const found = dailyPnl.find((d: any) => d.day === dateStr);
        return {
            day: format(date, 'MMM dd'),
            pnl: found ? found.pnl : 0
        };
    });

    const stats = [
        {
            label: 'Total Trades',
            value: totalTrades.toString(),
            icon: Activity,
            color: 'blue',
            bgColor: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-950/30',
            borderColor: 'border-blue-200 dark:border-blue-800/50'
        },
        {
            label: 'Win Rate',
            value: `${Number(winRate || 0).toFixed(1)}%`,
            icon: Target,
            color: Number(winRate || 0) >= 50 ? 'emerald' : 'orange',
            bgColor: Number(winRate || 0) >= 50 ? 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-950/30' : 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-950/30',
            borderColor: Number(winRate || 0) >= 50 ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-orange-200 dark:border-orange-800/50'
        },
        {
            label: 'Avg Profit/Trade',
            value: `₹${Number(avgProfitPerTrade || 0).toFixed(0)}`,
            icon: avgProfitPerTrade >= 0 ? TrendingUp : TrendingDown,
            color: avgProfitPerTrade >= 0 ? 'emerald' : 'red',
            bgColor: avgProfitPerTrade >= 0 ? 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-950/30' : 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-950/30',
            borderColor: avgProfitPerTrade >= 0 ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-red-200 dark:border-red-800/50'
        },
        {
            label: 'Profit Factor',
            value: Number(profitFactor || 0).toFixed(2),
            icon: BarChart3,
            color: 'purple',
            bgColor: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-950/30',
            borderColor: 'border-purple-200 dark:border-purple-800/50'
        },
        {
            label: 'Winning Trades',
            value: winningTrades.toString(),
            icon: Award,
            color: 'emerald',
            bgColor: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-950/30',
            borderColor: 'border-emerald-200 dark:border-emerald-800/50'
        },
        {
            label: 'Losing Trades',
            value: losingTrades.toString(),
            icon: AlertTriangle,
            color: 'red',
            bgColor: 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-950/30',
            borderColor: 'border-red-200 dark:border-red-800/50'
        }
    ];

    return (
        <div className="min-h-[calc(100vh-180px)] max-h-[calc(100vh-180px)] overflow-y-auto p-4 space-y-4 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Analytics</h2>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Performance metrics and insights
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className={cn(
                                "rounded-xl p-4 border bg-gradient-to-br",
                                stat.bgColor,
                                stat.borderColor
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="text-2xl font-black tabular-nums text-zinc-900 dark:text-white">
                                {stat.value}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-zinc-500 mb-1">Best Day</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">+₹{(bestDay.pnl ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-zinc-500">{bestDay.date || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-zinc-500 mb-1">Worst Day</p>
                            <p className="font-bold text-red-600 dark:text-red-400 text-lg">₹{(worstDay.pnl ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-zinc-500">{worstDay.date || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <ArrowDown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-zinc-500 mb-1">Max Drawdown</p>
                            <p className="font-bold text-yellow-600 dark:text-yellow-400 text-lg">{maxDrawdown}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* P&L Trend */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">P&L Trend (Last {getDaysCount()} Days)</h3>
                    <div className="flex gap-1">
                        {(['7D', '30D', '90D'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setTimePeriod(period)}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                                    timePeriod === period
                                        ? "bg-blue-500 text-white"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                )}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1">
                    {filteredDailyPnl.slice(-7).map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">{item.day}</span>
                            <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all",
                                        item.pnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                                    )}
                                    style={{
                                        width: `${Math.min(Math.abs(item.pnl) / 1000 * 10, 100)}%`
                                    }}
                                />
                            </div>
                            <span className={cn(
                                "text-xs font-bold w-20 text-right",
                                item.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {item.pnl >= 0 ? '+' : ''}₹{item.pnl.toFixed(0)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Win Rate Visualization */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Win Rate Distribution</h3>
                <div className="relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${Number(winRate || 0)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {Number(winRate || 0).toFixed(1)}% Win Rate
                        </span>
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    💡 <strong>Tip:</strong> Analytics are calculated based on your trading history.
                    More trades will provide more accurate insights.
                </p>
            </div>
        </div>
    );
}
