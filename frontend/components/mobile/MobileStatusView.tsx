"use client";
import React, { useState } from 'react';
import { Power, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Target, Plus, X, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigData {
    symbols: string[];
    strategy: string;
    interval: string;
    startTime: string;
    stopTime: string;
    capital: string;
}

interface MobileStatusViewProps {
    isSystemActive: boolean;
    isLoading: boolean;
    pnl: number;
    mode: 'PAPER' | 'LIVE';
    positionsCount: number;
    onToggleSystem: () => void;
    onStopBot: () => void;
    onViewTrades: () => void;
    config: ConfigData;
    onConfigChange: (config: ConfigData) => void;
    maxLoss: string;
    onMaxLossChange: (value: string) => void;
    isSafetyGuardOn: boolean;
    onSafetyGuardToggle: (value: boolean) => void;
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
    config,
    onConfigChange,
    maxLoss,
    onMaxLossChange,
    isSafetyGuardOn,
    onSafetyGuardToggle,
}: MobileStatusViewProps) {
    const [confirmStop, setConfirmStop] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [newSymbol, setNewSymbol] = useState('');

    const handleStopPress = () => {
        if (confirmStop) {
            onStopBot();
            setConfirmStop(false);
        } else {
            setConfirmStop(true);
            setTimeout(() => setConfirmStop(false), 3000);
        }
    };

    const handleAddSymbol = () => {
        if (newSymbol.trim() && !config.symbols.includes(newSymbol.trim().toUpperCase())) {
            onConfigChange({
                ...config,
                symbols: [...config.symbols, newSymbol.trim().toUpperCase() + '-EQ']
            });
            setNewSymbol('');
        }
    };

    const handleRemoveSymbol = (symbol: string) => {
        onConfigChange({
            ...config,
            symbols: config.symbols.filter(s => s !== symbol)
        });
    };

    const Section = ({
        id,
        title,
        icon: Icon,
        children
    }: {
        id: string;
        title: string;
        icon: typeof Target;
        children: React.ReactNode
    }) => (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
                onClick={() => setExpandedSection(expandedSection === id ? null : id)}
                className="w-full p-4 flex items-center gap-3 text-left"
                disabled={isSystemActive}
            >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                    <div className="font-bold text-zinc-900 dark:text-white">{title}</div>
                </div>
                <ChevronRight className={cn(
                    "w-5 h-5 text-zinc-400 transition-transform",
                    expandedSection === id && "rotate-90"
                )} />
            </button>
            {expandedSection === id && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {isSystemActive ? (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                            Stop the bot to modify settings
                        </div>
                    ) : (
                        children
                    )}
                </div>
            )}
        </div>
    );

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
                        <button
                            onClick={onViewTrades}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                View Active Trades
                            </span>
                            <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>

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

            {/* Configuration Sections */}
            <div className="space-y-3 pb-8">
                {/* Strategy Selection */}
                <Section id="strategy" title="Strategy" icon={Target}>
                    <div className="space-y-3">
                        {[
                            { id: 'orb', name: 'ORB', desc: 'Opening Range Breakout' },
                            { id: 'ema', name: 'EMA Crossover', desc: '8/30 EMA Strategy' },
                        ].map((strategy) => (
                            <button
                                key={strategy.id}
                                onClick={() => onConfigChange({ ...config, strategy: strategy.id.toUpperCase() })}
                                className={cn(
                                    "w-full p-3 rounded-xl text-left transition-all",
                                    config.strategy.toUpperCase() === strategy.id.toUpperCase()
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                                        : "bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent"
                                )}
                            >
                                <div className="font-bold text-zinc-900 dark:text-white">{strategy.name}</div>
                                <div className="text-xs text-zinc-500">{strategy.desc}</div>
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Symbols */}
                <Section id="symbols" title="Stock Universe" icon={Plus}>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value)}
                                placeholder="Enter symbol (e.g. RELIANCE)"
                                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                            />
                            <button
                                onClick={handleAddSymbol}
                                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium text-sm min-h-[44px]"
                            >
                                Add
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {config.symbols.map((symbol) => (
                                <span
                                    key={symbol}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    {symbol}
                                    <button
                                        onClick={() => handleRemoveSymbol(symbol)}
                                        className="w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        {config.symbols.length === 0 && (
                            <div className="text-sm text-zinc-500 text-center py-4">
                                No symbols selected. Add at least one stock.
                            </div>
                        )}
                    </div>
                </Section>

                {/* Timing */}
                <Section id="timing" title="Trading Hours" icon={Clock}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Start Time</label>
                                <input
                                    type="time"
                                    value={config.startTime}
                                    onChange={(e) => onConfigChange({ ...config, startTime: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px]"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">End Time</label>
                                <input
                                    type="time"
                                    value={config.stopTime}
                                    onChange={(e) => onConfigChange({ ...config, stopTime: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Timeframe</label>
                            <select
                                value={config.interval}
                                onChange={(e) => onConfigChange({ ...config, interval: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px]"
                            >
                                <option value="5">5 Minutes</option>
                                <option value="15">15 Minutes</option>
                                <option value="30">30 Minutes</option>
                                <option value="60">1 Hour</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Initial Capital (₹)</label>
                            <input
                                type="number"
                                value={config.capital}
                                onChange={(e) => onConfigChange({ ...config, capital: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px]"
                                placeholder="100000"
                            />
                        </div>
                    </div>
                </Section>

                {/* Safety Guard */}
                <Section id="safety" title="Safety Guard" icon={Shield}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                            <div>
                                <div className="font-medium text-zinc-900 dark:text-white">Enable Safety Guard</div>
                                <div className="text-xs text-zinc-500">Auto-stop on max loss</div>
                            </div>
                            <button
                                onClick={() => onSafetyGuardToggle(!isSafetyGuardOn)}
                                className={cn(
                                    "relative w-12 h-7 rounded-full transition-colors",
                                    isSafetyGuardOn ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform",
                                    isSafetyGuardOn ? "left-5.5 translate-x-0" : "left-0.5"
                                )} style={{ left: isSafetyGuardOn ? '22px' : '2px' }} />
                            </button>
                        </div>

                        {isSafetyGuardOn && (
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">Max Daily Loss (₹)</label>
                                <input
                                    type="number"
                                    value={maxLoss}
                                    onChange={(e) => onMaxLossChange(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm min-h-[44px] text-red-700 dark:text-red-400 font-mono"
                                    placeholder="5000"
                                />
                                <p className="text-xs text-zinc-500 mt-2">
                                    Bot will automatically stop and exit all positions if P&L drops below -₹{maxLoss || '0'}
                                </p>
                            </div>
                        )}
                    </div>
                </Section>
            </div>
        </div>
    );
}
