"use client";
import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Target, Award, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileAnalyticsViewProps {
    pnl?: number;
    winRate?: number;
    totalTrades?: number;
    profitableTrades?: number;
    losingTrades?: number;
}

export function MobileAnalyticsView({
    pnl = 0,
    winRate = 0,
    totalTrades = 0,
    profitableTrades = 0,
    losingTrades = 0
}: MobileAnalyticsViewProps) {
    const avgProfit = profitableTrades > 0 ? (pnl / profitableTrades) : 0;
    const avgLoss = losingTrades > 0 ? (pnl / losingTrades) : 0;

    const stats = [
        {
            label: 'Total P&L',
            value: `₹${pnl.toFixed(2)}`,
            icon: pnl >= 0 ? TrendingUp : TrendingDown,
            color: pnl >= 0 ? 'emerald' : 'red',
            bgColor: pnl >= 0 ? 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-950/30' : 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-950/30',
            borderColor: pnl >= 0 ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-red-200 dark:border-red-800/50'
        },
        {
            label: 'Win Rate',
            value: `${winRate.toFixed(1)}%`,
            icon: Target,
            color: winRate >= 50 ? 'blue' : 'orange',
            bgColor: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-950/30',
            borderColor: 'border-blue-200 dark:border-blue-800/50'
        },
        {
            label: 'Total Trades',
            value: totalTrades.toString(),
            icon: BarChart3,
            color: 'purple',
            bgColor: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-950/30',
            borderColor: 'border-purple-200 dark:border-purple-800/50'
        },
        {
            label: 'Profitable',
            value: profitableTrades.toString(),
            icon: Award,
            color: 'emerald',
            bgColor: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-950/30',
            borderColor: 'border-emerald-200 dark:border-emerald-800/50'
        },
        {
            label: 'Losing',
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
                                <Icon className={cn(
                                    "w-4 h-4",
                                    `text-${stat.color}-600 dark:text-${stat.color}-400`
                                )} />
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    {stat.label}
                                </span>
                            </div>
                            <div className={cn(
                                "text-2xl font-black tabular-nums",
                                `text-${stat.color}-600 dark:text-${stat.color}-400`
                            )}>
                                {stat.value}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Win Rate Visualization */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Win Rate Distribution</h3>
                <div className="relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${winRate}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {winRate.toFixed(1)}% Win Rate
                        </span>
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Average Profit/Loss */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Avg Profit
                        </span>
                    </div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +₹{Math.abs(avgProfit).toFixed(2)}
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Avg Loss
                        </span>
                    </div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                        -₹{Math.abs(avgLoss).toFixed(2)}
                    </div>
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
