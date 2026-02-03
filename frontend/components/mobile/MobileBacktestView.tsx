"use client";
import React, { useState } from 'react';
import { TrendingUp, Calendar, DollarSign, Target, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

    const handleAddSymbol = () => {
        if (newSymbol.trim() && !symbols.includes(newSymbol.trim().toUpperCase())) {
            setSymbols([...symbols, newSymbol.trim().toUpperCase() + '-EQ']);
            setNewSymbol('');
        }
    };

    const handleRemoveSymbol = (symbol: string) => {
        setSymbols(symbols.filter(s => s !== symbol));
    };

    const handleRunBacktest = () => {
        if (!startDate || !endDate) {
            alert('Please select start and end dates');
            return;
        }
        if (symbols.length === 0) {
            alert('Please add at least one symbol');
            return;
        }

        setIsRunning(true);
        // Simulate backtest running
        setTimeout(() => {
            setIsRunning(false);
            alert('Backtest completed! (This is a demo)');
        }, 2000);
    };

    return (
        <div className="min-h-[calc(100vh-180px)] max-h-[calc(100vh-180px)] overflow-y-auto p-4 space-y-4 pb-24">
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
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px]"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm min-h-[44px]"
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
                        className="w-full pl-10 pr-3 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono"
                        placeholder="100000"
                    />
                </div>
            </div>

            {/* Run Button */}
            <button
                onClick={handleRunBacktest}
                disabled={isRunning}
                className={cn(
                    "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all",
                    isRunning
                        ? "bg-zinc-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 active:scale-95"
                )}
            >
                {isRunning ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Running Backtest...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5" />
                        Run Backtest
                    </>
                )}
            </button>
        </div>
    );
}
