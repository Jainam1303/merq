"use client";
import React, { useState } from 'react';
import { TrendingUp, Calendar, DollarSign, Target, Play, X, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson } from '@/lib/api';
import { toast } from 'sonner';

interface MobileBacktestViewProps {
    onRunBacktest?: (config: any) => void;
}

export function MobileBacktestView({ onRunBacktest }: MobileBacktestViewProps) {
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

    return (
        <div className="min-h-[calc(100vh-180px)] p-4 space-y-4 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Backtest</h2>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Run historical simulations to test your strategy
                </p>
            </div>

            {/* Strategy Selection */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Strategy</label>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'orb', name: 'ORB', desc: 'Opening Range Breakout' },
                        { id: 'ema', name: 'EMA', desc: '8/30 EMA Crossover' }
                    ].map((strategy) => (
                        <button
                            key={strategy.id}
                            onClick={() => setSelectedStrategy(strategy.id)}
                            className={cn(
                                "p-3 rounded-xl text-left transition-all border-2",
                                selectedStrategy === strategy.id
                                    ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500"
                                    : "bg-zinc-50 dark:bg-zinc-800 border-transparent"
                            )}
                        >
                            <div className={cn(
                                "text-sm font-bold mb-1",
                                selectedStrategy === strategy.id
                                    ? "text-cyan-600 dark:text-cyan-400"
                                    : "text-zinc-700 dark:text-zinc-300"
                            )}>
                                {strategy.name}
                            </div>
                            <div className="text-xs text-zinc-500">{strategy.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Symbols */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
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
                        className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium text-sm min-h-[44px]"
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
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px] focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px] focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Capital */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold"
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
    );
}
