"use client";
import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Target, Play, X, Loader2, Save, History, ChevronLeft, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson } from '@/lib/api';
import { toast } from 'sonner';

// Updated Strategies List
const strategies = [
    { label: "MerQ Alpha I", value: "orb", description: "Opening Range Breakout" },
    { label: "MerQ Alpha II", value: "ema", description: "EMA Crossover" },
    { label: "MerQ Alpha III", value: "pullback", description: "EMA Pullback" },
    { label: "MerQ Alpha IV", value: "engulfing", description: "Engulfing Pattern" },
    { label: "MerQ Alpha V", value: "timebased", description: "Time-Based Entry" },
    { label: "TEST", value: "test", description: "Debug Strategy" },
];

interface MobileBacktestViewProps {
    onRunBacktest?: (config: any) => void;
}

function MobileBacktestHistory({ onBack }: { onBack: () => void }) {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await fetchJson('/backtest_history');
            if (res.status === 'success' && Array.isArray(res.data)) {
                setHistory(res.data);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            toast.error('Failed to load history');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await fetchJson(`/backtest_history/${id}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(h => h.id !== id));
            toast.success('Deleted successfully');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 shrink-0 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <ChevronLeft className="w-6 h-6 text-zinc-900 dark:text-white" />
                </button>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Backtest History</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No backtest history found</p>
                    </div>
                ) : (
                    history.map((record) => {
                        const strategyLabel = strategies.find(s => s.value === record.strategy)?.label || record.strategy;
                        const pnl = parseFloat(record.summary?.totalPnL || 0);
                        const isPositive = pnl >= 0;

                        return (
                            <div key={record.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-zinc-900 dark:text-white text-base mb-0.5">
                                            {strategyLabel}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {new Date(record.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(record.id)}
                                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Symbol</div>
                                        <div className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                            {record.summary?.symbol || record.summary?.Symbol || 'N/A'}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        isPositive ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10"
                                    )}>
                                        <div className="text-[10px] uppercase font-bold mb-0.5 opacity-70">P&L</div>
                                        <div className={cn(
                                            "font-bold text-sm",
                                            isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                                        )}>
                                            {isPositive ? '+' : ''}{pnl.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
                                    <span>Trades: <b className="text-zinc-900 dark:text-white">{record.summary?.totalTrades || 0}</b></span>
                                    <span>Win Rate: <b className="text-zinc-900 dark:text-white">{parseFloat(record.summary?.winRate || 0).toFixed(1)}%</b></span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export function MobileBacktestView({ onRunBacktest }: MobileBacktestViewProps) {
    const [showHistory, setShowHistory] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState('orb');
    const [symbols, setSymbols] = useState<string[]>(['RELIANCE-EQ', 'TCS-EQ']);
    const [newSymbol, setNewSymbol] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [capital, setCapital] = useState('100000');
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleAddSymbol = () => {
        if (newSymbol.trim() && !symbols.includes(newSymbol.trim().toUpperCase())) {
            setSymbols([...symbols, newSymbol.trim().toUpperCase() + '-EQ']);
            setNewSymbol('');
        }
    };

    const handleRemoveSymbol = (symbol: string) => {
        setSymbols(symbols.filter(s => s !== symbol));
    };

    const handleRunBacktest = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select start and end dates');
            return;
        }
        if (symbols.length === 0) {
            toast.error('Please add at least one symbol');
            return;
        }

        setIsRunning(true);
        setResults([]);

        try {
            const payload = {
                strategy: selectedStrategy,
                symbols: symbols,
                interval: "15", // Default to 15m for mobile simplification or add selector
                startDate: startDate,
                endDate: endDate,
                capital: capital
            };

            const res = await fetchJson('/backtest', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.status === 'success' && Array.isArray(res.results)) {
                setResults(res.results);
                toast.success(`Backtest completed with ${res.results.length} results`);
            } else {
                toast.error(res.message || 'Backtest failed');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to run backtest');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSaveResult = async () => {
        if (results.length === 0) return;
        try {
            await fetchJson('/save_backtest', {
                method: 'POST',
                body: JSON.stringify({
                    results: results,
                    strategy: selectedStrategy,
                    interval: '15',
                    fromDate: startDate,
                    toDate: endDate
                })
            });
            toast.success("Results saved to history");
        } catch (e) {
            toast.error("Failed to save result");
        }
    };

    if (showHistory) {
        return <MobileBacktestHistory onBack={() => setShowHistory(false)} />;
    }

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 shrink-0 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-500" />
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Backtest</h2>
                </div>
                <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                    <History size={14} />
                    History
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">

                {/* Strategy Selection - Dropdown */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Strategy</label>
                    <div className="relative">
                        <select
                            value={selectedStrategy}
                            onChange={(e) => setSelectedStrategy(e.target.value)}
                            className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        >
                            {strategies.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <ChevronLeft className="w-4 h-4 -rotate-90" />
                        </div>
                    </div>
                    {/* Strategy Description */}
                    <div className="mt-2 text-xs text-zinc-500 px-1">
                        {strategies.find(s => s.value === selectedStrategy)?.description}
                    </div>
                </div>

                {/* Symbols */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Symbols</label>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                            placeholder="Enter symbol (e.g. RELIANCE)"
                            className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                        />
                        <button
                            onClick={handleAddSymbol}
                            className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium text-sm min-h-[42px]"
                        >
                            Add
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {symbols.map((symbol) => (
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
                </div>

                {/* Date Range */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Date Range</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[42px] focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[42px] focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Capital */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Initial Capital</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="number"
                            value={capital}
                            onChange={(e) => setCapital(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white"
                            placeholder="100000"
                        />
                    </div>
                </div>

                {/* Run Button */}
                <button
                    onClick={handleRunBacktest}
                    disabled={isRunning}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-cyan-500/25",
                        isRunning
                            ? "bg-zinc-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 active:scale-95"
                    )}
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Running Simulation...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            Run Backtest
                        </>
                    )}
                </button>

                {/* Results Section */}
                {results.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Results</h3>
                            <button
                                onClick={handleSaveResult}
                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
                            >
                                <Save size={14} />
                                Save
                            </button>
                        </div>

                        {results.map((r, i) => {
                            const rawPnL = r['Total P&L'] || r.summary?.totalPnL || 0;
                            // Handle string formatting like "₹5,000.00" or raw number
                            const pnlVal = typeof rawPnL === 'string' ? parseFloat(rawPnL.replace(/,/g, '').replace(/₹/g, '')) : rawPnL;
                            const isPositive = pnlVal >= 0;

                            const symbol = r.Symbol || r.summary?.symbol || 'Unknown';
                            const winRate = r['Win Rate %'] || r.summary?.winRate || '0%';
                            const trades = r['Total Trades'] || r.summary?.totalTrades || 0;

                            return (
                                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-zinc-900 dark:text-white text-lg">{symbol}</div>
                                            <div className="text-xs text-zinc-500">{trades} Trades • {winRate} Win Rate</div>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-lg font-mono font-bold text-sm",
                                            isPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}>
                                            {isPositive ? '+' : ''}{typeof rawPnL === 'number' ? rawPnL.toFixed(2) : rawPnL}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg">
                                            <div className="text-zinc-500 mb-1">Max Drawdown</div>
                                            <div className="font-mono text-zinc-900 dark:text-white">{r['Max Drawdown'] || r.summary?.maxDrawdown || '0'}</div>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg">
                                            <div className="text-zinc-500 mb-1">Final Capital</div>
                                            <div className="font-mono text-zinc-900 dark:text-white">{r['Final Capital'] || r.summary?.finalCapital || '0'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
