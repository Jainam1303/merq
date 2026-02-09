"use client";
import React, { useState, useRef } from 'react';
import { Power, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Target, Plus, X, Clock, Shield, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

// Extracted Section Component to prevent re-renders losing input focus
const StatusSection = ({
    id,
    title,
    icon: Icon,
    isExpanded,
    onToggle,
    isSystemActive,
    children
}: {
    id: string;
    title: string;
    icon: any;
    isExpanded: boolean;
    onToggle: () => void;
    isSystemActive: boolean;
    children: React.ReactNode
}) => {
    return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center gap-3 text-left active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors"
                disabled={isSystemActive}
                type="button"
            >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-900 dark:text-white truncate">{title}</div>
                </div>
                <ChevronRight className={cn(
                    "w-5 h-5 text-zinc-400 transition-transform shrink-0",
                    isExpanded && "rotate-90"
                )} />
            </button>
            {isExpanded && (
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
};

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
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Parse CSV: split by new lines or commas, trim, filter empty
            const symbols = text
                .split(/[\n,]+/)
                .map(s => s.trim().toUpperCase())
                .filter(s => s && s.length > 2); // basic validation

            if (symbols.length > 0) {
                // Merge with existing unique
                const newSymbols = Array.from(new Set([...config.symbols, ...symbols.map(s => s + '-EQ')]));
                onConfigChange({ ...config, symbols: newSymbols });
                toast.success(`Imported ${symbols.length} symbols`);
            } else {
                toast.error("No valid symbols found in CSV");
            }

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-4 p-4 pb-24">
            {/* System Status Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-sm font-medium text-zinc-500 mb-1">System Status</div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                isSystemActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                            )} />
                            <span className={cn(
                                "text-lg font-bold",
                                isSystemActive ? "text-emerald-500" : "text-red-500"
                            )}>
                                {isSystemActive ? "Engine Running" : "Engine Stopped"}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={isSystemActive ? handleStopPress : onToggleSystem}
                        disabled={isLoading}
                        className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg",
                            isLoading ? "bg-zinc-100 dark:bg-zinc-800 animate-pulse" :
                                isSystemActive
                                    ? confirmStop
                                        ? "bg-red-500 text-white shadow-red-500/25 ring-2 ring-red-500 ring-offset-2 dark:ring-offset-zinc-900"
                                        : "bg-emerald-500 text-white shadow-emerald-500/25"
                                    : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-zinc-900/10"
                        )}
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Power className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* P&L Display */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="text-xs font-medium text-zinc-500 mb-1">Today's P&L</div>
                        <div className={cn(
                            "text-xl font-black tabular-nums tracking-tight",
                            (Number(pnl) || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                            {(Number(pnl) || 0) >= 0 ? "+" : ""}₹{Number(pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="text-xs font-medium text-zinc-500 mb-1">Active Positions</div>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-zinc-900 dark:text-white">{positionsCount}</span>
                            {positionsCount > 0 && (
                                <button
                                    onClick={onViewTrades}
                                    className="text-xs font-bold text-blue-500 flex items-center gap-1 active:opacity-70"
                                >
                                    View <ChevronRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Config Sections */}
            <div className="space-y-3">
                {/* Stock Universe */}
                <StatusSection
                    id="symbols"
                    title="Stock Universe"
                    icon={Plus}
                    isExpanded={expandedSection === 'symbols'}
                    onToggle={() => setExpandedSection(expandedSection === 'symbols' ? null : 'symbols')}
                    isSystemActive={isSystemActive}
                >
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value)}
                                placeholder="Enter symbol (e.g. RELIANCE)"
                                className="flex-1 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[48px] uppercase text-zinc-900 dark:text-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSymbol();
                                    }
                                }}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="characters"
                            />
                            <button
                                onClick={handleAddSymbol}
                                className="px-5 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm min-h-[48px] min-w-[64px] transition-colors"
                                type="button"
                            >
                                Add
                            </button>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.txt"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm min-h-[48px] transition-colors"
                                type="button"
                            >
                                <Upload className="w-4 h-4" />
                                Import CSV
                            </button>

                            <button
                                onClick={() => onConfigChange({ ...config, symbols: [] })}
                                disabled={config.symbols.length === 0}
                                className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium text-sm min-h-[48px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                type="button"
                            >
                                <Trash2 className="w-4 h-4" />
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
                                        type="button"
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
                </StatusSection>

                {/* Strategy */}
                <StatusSection
                    id="strategy"
                    title="Strategy"
                    icon={Target}
                    isExpanded={expandedSection === 'strategy'}
                    onToggle={() => setExpandedSection(expandedSection === 'strategy' ? null : 'strategy')}
                    isSystemActive={isSystemActive}
                >
                    <div className="space-y-3">
                        {['ORB', 'EMA', 'PULLBACK'].map((s) => (
                            <button
                                key={s}
                                onClick={() => onConfigChange({ ...config, strategy: s })}
                                className={cn(
                                    "w-full p-3 rounded-lg border text-left transition-all",
                                    config.strategy === s
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                        : "bg-zinc-50 dark:bg-zinc-800 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                )}
                            >
                                <div className={cn(
                                    "font-medium",
                                    config.strategy === s ? "text-blue-700 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300"
                                )}>
                                    {s === 'ORB' ? 'Opening Range Breakout' :
                                        s === 'EMA' ? 'EMA Crossover' : 'Pullback Strategy'}
                                </div>
                            </button>
                        ))}
                    </div>
                </StatusSection>

                {/* Trading Hours */}
                <StatusSection
                    id="hours"
                    title="Trading Hours"
                    icon={Clock}
                    isExpanded={expandedSection === 'hours'}
                    onToggle={() => setExpandedSection(expandedSection === 'hours' ? null : 'hours')}
                    isSystemActive={isSystemActive}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-zinc-500 mb-1 block">Start Time</label>
                            <input
                                type="time"
                                value={config.startTime}
                                onChange={(e) => onConfigChange({ ...config, startTime: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-zinc-500 mb-1 block">Stop Time</label>
                            <input
                                type="time"
                                value={config.stopTime}
                                onChange={(e) => onConfigChange({ ...config, stopTime: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white"
                            />
                        </div>
                    </div>
                </StatusSection>

                {/* Safety Guard */}
                <StatusSection
                    id="safety"
                    title="Safety Guard"
                    icon={Shield}
                    isExpanded={expandedSection === 'safety'}
                    onToggle={() => setExpandedSection(expandedSection === 'safety' ? null : 'safety')}
                    isSystemActive={isSystemActive}
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enable Safety Guard</span>
                            <button
                                onClick={() => onSafetyGuardToggle(!isSafetyGuardOn)}
                                className={cn(
                                    "w-11 h-6 rounded-full transition-colors relative",
                                    isSafetyGuardOn ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
                                    isSafetyGuardOn && "translate-x-5"
                                )} />
                            </button>
                        </div>
                        {isSafetyGuardOn && (
                            <div>
                                <label className="text-xs font-medium text-zinc-500 mb-1 block">Max Daily Loss (₹)</label>
                                <input
                                    type="number"
                                    value={maxLoss}
                                    onChange={(e) => onMaxLossChange(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white"
                                />
                            </div>
                        )}
                    </div>
                </StatusSection>
            </div>
        </div>
    );
}
