"use client";
import React, { useState } from 'react';
import { Power, ChevronRight, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileStatusViewProps {
    isSystemActive: boolean;
    isLoading: boolean;
    pnl: number;
    mode: 'PAPER' | 'LIVE';
    positionsCount: number;
    onToggleSystem: () => void;
    onStopBot: () => void;
    onViewTrades: () => void;
}

export function MobileStatusView({
    isSystemActive,
    isLoading,
    pnl,
    mode,
    positionsCount,
    onToggleSystem,
    onStopBot,
    onViewTrades,
}: MobileStatusViewProps) {
    const [confirmStop, setConfirmStop] = useState(false);

    const handleStopPress = () => {
        if (confirmStop) {
            onStopBot();
            setConfirmStop(false);
        } else {
            setConfirmStop(true);
            // Auto-reset after 3 seconds
            setTimeout(() => setConfirmStop(false), 3000);
        }
    };

    return (
        <div className="min-h-[calc(100vh-180px)] flex flex-col p-4 space-y-4">
            {/* Primary Status Card - PnL Hero */}
            <div className={cn(
                "rounded-2xl p-6 text-center transition-all duration-300",
                pnl >= 0
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50"
                    : "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-950/30 border border-red-200 dark:border-red-800/50"
            )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                    {pnl >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Today's P&L
                    </span>
                </div>
                <div className={cn(
                    "text-4xl font-black tabular-nums tracking-tight",
                    pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                    {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    {mode === 'PAPER' ? '📝 Paper Trading' : '🔴 Live Trading'}
                </div>
            </div>

            {/* System Status & Control */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-3 h-3 rounded-full transition-all",
                            isSystemActive
                                ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse"
                                : "bg-zinc-400"
                        )} />
                        <div>
                            <div className="font-bold text-zinc-900 dark:text-white">
                                {isSystemActive ? 'Engine Running' : 'Engine Stopped'}
                            </div>
                            <div className="text-xs text-zinc-500">
                                {positionsCount} active position{positionsCount !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    {/* Start/Stop Toggle */}
                    <button
                        onClick={onToggleSystem}
                        disabled={isLoading}
                        className={cn(
                            "relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95",
                            isLoading && "opacity-60 cursor-not-allowed",
                            isSystemActive
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                                : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                        )}
                    >
                        <Power className="w-7 h-7 text-white" strokeWidth={2.5} />
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Quick Actions */}
                {isSystemActive && (
                    <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        {/* View Trades Quick Link */}
                        <button
                            onClick={onViewTrades}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                View Active Trades
                            </span>
                            <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>

                        {/* Emergency Stop - Requires Confirmation */}
                        <button
                            onClick={handleStopPress}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm transition-all min-h-[48px]",
                                confirmStop
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50"
                            )}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {confirmStop ? 'TAP AGAIN TO CONFIRM STOP' : 'Emergency Stop'}
                        </button>
                    </div>
                )}
            </div>

            {/* Mode Indicator */}
            <div className={cn(
                "rounded-xl p-4 flex items-center gap-3",
                mode === 'LIVE'
                    ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50"
                    : "bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50"
            )}>
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    mode === 'LIVE'
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                )}>
                    {mode === 'LIVE' ? '🔴' : '📝'}
                </div>
                <div>
                    <div className={cn(
                        "font-bold",
                        mode === 'LIVE' ? "text-red-700 dark:text-red-400" : "text-blue-700 dark:text-blue-400"
                    )}>
                        {mode === 'LIVE' ? 'LIVE MODE' : 'PAPER MODE'}
                    </div>
                    <div className="text-xs text-zinc-500">
                        {mode === 'LIVE'
                            ? 'Real orders will be placed'
                            : 'Simulated trades only'}
                    </div>
                </div>
            </div>
        </div>
    );
}
