"use client";
import React, { useState, useRef } from 'react';
import { ChevronRight, Plus, X, Clock, Target, Shield, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConfigData {
    symbols: string[];
    strategy: string;
    interval: string;
    startTime: string;
    stopTime: string;
    signalCutoffTime: string;
    capital: string;
}

interface MobileSettingsViewProps {
    config: ConfigData;
    onConfigChange: (config: ConfigData) => void;
    isSystemActive: boolean;
    maxLoss: string;
    onMaxLossChange: (value: string) => void;
    isSafetyGuardOn: boolean;
    onSafetyGuardToggle: (value: boolean) => void;
}

// Extracted Section Component to prevent re-renders losing input focus
const SettingsSection = ({
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
}) => (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full p-4 flex items-center gap-3 text-left"
            disabled={isSystemActive}
            type="button"
        >
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="flex-1">
                <div className="font-bold text-zinc-900 dark:text-white">{title}</div>
            </div>
            <ChevronRight className={cn(
                "w-5 h-5 text-zinc-400 transition-transform",
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

export function MobileSettingsView({
    config,
    onConfigChange,
    isSystemActive,
    maxLoss,
    onMaxLossChange,
    isSafetyGuardOn,
    onSafetyGuardToggle,
}: MobileSettingsViewProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('strategy');
    const [newSymbol, setNewSymbol] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="min-h-[calc(100vh-180px)] p-4 space-y-3 pb-8">
            {/* Strategy Selection */}
            <SettingsSection
                id="strategy"
                title="Strategy"
                icon={Target}
                isExpanded={expandedSection === 'strategy'}
                onToggle={() => setExpandedSection(expandedSection === 'strategy' ? null : 'strategy')}
                isSystemActive={isSystemActive}
            >
                <div className="space-y-2">
                    {[
                        { value: 'ORB', label: 'MerQ Alpha I', desc: 'Opening Range Breakout (9:15-9:30)' },
                        { value: 'EMA', label: 'MerQ Alpha II', desc: 'EMA 8/30 Crossover Strategy' },
                        { value: 'PULLBACK', label: 'MerQ Alpha III', desc: 'EMA Pullback Trend Strategy' },
                        { value: 'ENGULFING', label: 'MerQ Alpha IV', desc: 'Bullish/Bearish Engulfing Pattern' },
                        { value: 'TIMEBASED', label: 'MerQ Alpha V', desc: 'Fixed Time Entry (10AM, 2PM)' },
                        { value: 'VWAPFAILURE', label: 'MerQ Alpha VI', desc: 'VWAP + Volume Failure Scalping' },
                        { value: 'TEST', label: 'TEST Mode', desc: 'Immediate BUY for testing orders' },
                    ].map((strategy) => (
                        <button
                            key={strategy.value}
                            onClick={() => onConfigChange({ ...config, strategy: strategy.value })}
                            className={cn(
                                "w-full p-3 rounded-xl text-left transition-all",
                                config.strategy === strategy.value
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                                    : "bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent"
                            )}
                        >
                            <div className="font-bold text-zinc-900 dark:text-white">{strategy.label}</div>
                            <div className="text-xs text-zinc-500">{strategy.desc}</div>
                        </button>
                    ))}
                </div>
            </SettingsSection>

            {/* Symbols */}
            <SettingsSection
                id="symbols"
                title="Stock Universe"
                icon={Plus}
                isExpanded={expandedSection === 'symbols'}
                onToggle={() => setExpandedSection(expandedSection === 'symbols' ? null : 'symbols')}
                isSystemActive={isSystemActive}
            >
                <div className="space-y-3">
                    {/* Add Symbol Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                            placeholder="Enter symbol (e.g. RELIANCE)"
                            className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px] text-zinc-900 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                        />
                        <button
                            onClick={handleAddSymbol}
                            className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium text-sm min-h-[44px]"
                        >
                            Add
                        </button>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex gap-2">
                        {/* Import CSV Button */}
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

                        {/* Delete All Button */}
                        <button
                            onClick={() => onConfigChange({ ...config, symbols: [] })}
                            disabled={config.symbols.length === 0}
                            className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium text-sm min-h-[48px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Symbol Tags */}
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
            </SettingsSection>

            {/* Timing */}
            <SettingsSection
                id="timing"
                title="Trading Hours"
                icon={Clock}
                isExpanded={expandedSection === 'timing'}
                onToggle={() => setExpandedSection(expandedSection === 'timing' ? null : 'timing')}
                isSystemActive={isSystemActive}
            >
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

                    {/* Signal Cutoff Time */}
                    <div>
                        <label className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                            Signal Cutoff Time
                        </label>
                        <input
                            type="time"
                            value={config.signalCutoffTime}
                            onChange={(e) => onConfigChange({ ...config, signalCutoffTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-sm min-h-[44px] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                        />
                        <p className="text-[11px] text-amber-600 dark:text-amber-400/70 mt-1.5">
                            Algo stops finding new signals after this time. Open positions continue TP/SL monitoring.
                        </p>
                    </div>


                    <div>
                        <label className="text-xs text-zinc-500 mb-2 block">Timeframe</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: '5', label: '5 Minutes' },
                                { value: '15', label: '15 Minutes' },
                                { value: '30', label: '30 Minutes' },
                                { value: '60', label: '1 Hour' },
                            ].map((timeframe) => (
                                <button
                                    key={timeframe.value}
                                    onClick={() => onConfigChange({ ...config, interval: timeframe.value })}
                                    className={cn(
                                        "px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-2",
                                        config.interval === timeframe.value
                                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400"
                                            : "bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    )}
                                    type="button"
                                >
                                    {timeframe.label}
                                </button>
                            ))}
                        </div>
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
            </SettingsSection>

            {/* Safety Guard */}
            <SettingsSection
                id="safety"
                title="Safety Guard"
                icon={Shield}
                isExpanded={expandedSection === 'safety'}
                onToggle={() => setExpandedSection(expandedSection === 'safety' ? null : 'safety')}
                isSystemActive={isSystemActive}
            >
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
                            )} />
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
            </SettingsSection>
        </div>
    );
}
