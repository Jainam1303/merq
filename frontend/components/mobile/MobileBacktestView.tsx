"use client";
import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Calendar, Play, X, Loader2, Save, History, ChevronLeft, Trash2, Upload, Clock, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Updated Strategies List - same as desktop
const strategies = [
    { label: "MerQ Alpha I", value: "orb", description: "Opening Range Breakout (9:15-9:30)" },
    { label: "MerQ Alpha II", value: "ema", description: "EMA 8/30 Crossover Strategy" },
    { label: "MerQ Alpha III", value: "pullback", description: "EMA Pullback Trend Strategy" },
    { label: "MerQ Alpha IV", value: "engulfing", description: "Bullish/Bearish Engulfing Pattern" },
    { label: "MerQ Alpha V", value: "timebased", description: "Fixed Time Entry (10AM, 2PM)" },
    { label: "TEST", value: "test", description: "Immediate BUY for testing orders" },
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

// Date Time Picker Component
function DateTimePicker({ value, onChange, label }: { value: string; onChange: (val: string) => void; label: string }) {
    const [showPicker, setShowPicker] = useState(false);
    const [date, setDate] = useState(value ? value.split(' ')[0] : '');
    const [hour, setHour] = useState(value ? new Date(value.replace(' ', 'T')).getHours().toString().padStart(2, '0') : '09');
    const [minute, setMinute] = useState(value ? new Date(value.replace(' ', 'T')).getMinutes().toString().padStart(2, '0') : '15');

    useEffect(() => {
        if (date) {
            const newValue = `${date} ${hour}:${minute}`;
            onChange(newValue);
        }
    }, [date, hour, minute]);

    return (
        <div className="relative">
            <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
            <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-left flex items-center justify-between min-h-[42px]"
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-900 dark:text-white font-medium">
                        {value ? format(new Date(value.replace(' ', 'T')), 'dd-MM-yyyy HH:mm') : 'Select date & time'}
                    </span>
                </div>
                {showPicker ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>

            {showPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-4 space-y-3">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Hour</label>
                            <select
                                value={hour}
                                onChange={(e) => setHour(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                            >
                                {Array.from({ length: 24 }, (_, i) => i).map(h => (
                                    <option key={h} value={h.toString().padStart(2, '0')}>
                                        {h.toString().padStart(2, '0')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Minute</label>
                            <select
                                value={minute}
                                onChange={(e) => setMinute(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white"
                            >
                                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                    <option key={m} value={m.toString().padStart(2, '0')}>
                                        {m.toString().padStart(2, '0')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPicker(false)}
                        className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium text-sm"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}

export function MobileBacktestView({ onRunBacktest }: MobileBacktestViewProps) {
    const [showHistory, setShowHistory] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState('orb');
    // Store stocks as objects like desktop: { symbol, token, exchange }
    const [selectedStocks, setSelectedStocks] = useState<any[]>([]);
    const [savedStocks, setSavedStocks] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [startDate, setStartDate] = useState('2025-01-01 09:15');
    const [endDate, setEndDate] = useState('2025-01-31 15:30');
    const [interval, setInterval] = useState('15');
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [rawResults, setRawResults] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load saved stocks on mount - same as desktop
    useEffect(() => {
        loadSavedStocks();
    }, []);

    const loadSavedStocks = async () => {
        try {
            const res = await fetchJson('/symbols');
            setSavedStocks(res || []);
        } catch (e) { console.error(e); }
    };

    // Debounced Search Effect - same as desktop
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setSearching(true);
                try {
                    const res = await fetchJson(`/search_scrip?q=${searchQuery}`);
                    setSearchResults(res || []);
                    setShowDropdown(true);
                } catch (e) {
                    console.error(e);
                    setSearchResults([]);
                } finally {
                    setSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Helper to resolve token if missing - same as desktop
    const resolveToken = async (symbol: string): Promise<any> => {
        try {
            const res = await fetchJson(`/search_scrip?q=${symbol}`);
            const match = res.find((r: any) => r.symbol === symbol) || res[0];
            return match ? { symbol: match.symbol, token: match.token, exchange: match.exchange } : null;
        } catch (e) {
            console.error("Token resolution failed for", symbol, e);
            return null;
        }
    };

    const addStock = async (stock: any) => {
        let stockObj = stock;

        // If it's just a symbol string or object without token, resolve it
        if (!stockObj.token) {
            const sym = stockObj.symbol || stockObj;
            const resolved = await resolveToken(sym);
            if (resolved) {
                stockObj = resolved;
            } else {
                stockObj = { symbol: sym, token: null, exchange: 'NSE' };
            }
        }

        if (!selectedStocks.some(s => s.symbol === stockObj.symbol)) {
            setSelectedStocks(prev => [...prev, {
                symbol: stockObj.symbol,
                token: stockObj.token,
                exchange: stockObj.exchange || 'NSE'
            }]);
        }

        // Add to My Stocklist (DB) - same as desktop
        try {
            await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(stockObj) });
            loadSavedStocks();
        } catch (e) { console.error(e); }

        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
    };

    const removeStock = (symbol: string) => {
        setSelectedStocks(selectedStocks.filter(s => s.symbol !== symbol));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const symbols = text
                .split(/[\n,]+/)
                .map(s => s.trim().toUpperCase())
                .filter(s => s && s.length > 2);

            if (symbols.length > 0) {
                const existing = new Set(selectedStocks.map(s => s.symbol));
                const newItems = symbols
                    .filter(s => !existing.has(s))
                    .map(s => ({ symbol: s, token: null, exchange: 'NSE' }));

                setSelectedStocks([...selectedStocks, ...newItems]);
                toast.success(`Imported ${symbols.length} symbols`);
            } else {
                toast.error("No valid symbols found in CSV");
            }

            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    // Run backtest - matching desktop payload format exactly
    const handleRunBacktest = async () => {
        if (selectedStocks.length === 0) {
            toast.error('Please add at least one stock');
            return;
        }

        setIsRunning(true);
        setResults([]);
        setRawResults([]);

        try {
            // Build payload matching desktop format exactly
            const payload = {
                strategy: selectedStrategy,
                interval: interval,
                capital: 100000,  // Default capital - same as desktop
                from_date: startDate,
                to_date: endDate,
                symbols: selectedStocks  // Array of objects { symbol, token, exchange }
            };

            console.log('[Mobile Backtest] Sending payload:', payload);
            const res = await fetchJson('/backtest', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            console.log('[Mobile Backtest] Response:', res);

            if (res.status === 'success' && res.results && res.results.length > 0) {
                setRawResults(res.results);

                // Parse results matching desktop format
                // Backend returns: { Symbol, 'Total Trades', 'Win Rate %', 'Total P&L', 'Final Capital', 'Max Drawdown %' }
                const parsedResults = res.results.map((r: any) => {
                    const pnl = parseFloat((r['Total P&L'] || '0').toString().replace(/,/g, '').replace(/%/g, ''));
                    const winRate = parseFloat((r['Win Rate %'] || '0').toString().replace(/%/g, ''));
                    const totalTrades = parseInt(r['Total Trades'] || '0');
                    const maxDrawdown = parseFloat((r['Max Drawdown %'] || '0').toString().replace(/%/g, ''));

                    return {
                        symbol: r.Symbol || r.symbol || 'Unknown',
                        totalPnL: pnl,
                        totalTrades: totalTrades,
                        winRate: winRate,
                        maxDrawdown: maxDrawdown,
                        finalCapital: r['Final Capital'] || 0
                    };
                });

                setResults(parsedResults);
                toast.success(`Backtest completed with ${parsedResults.length} results`);
            } else {
                console.log('[Mobile Backtest] No results or error:', res);
                toast.error(res.message || 'No results returned');
            }
        } catch (error: any) {
            console.error('[Mobile Backtest] Error:', error);
            toast.error(error.message || 'Failed to run backtest');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSaveResult = async () => {
        if (rawResults.length === 0) return;
        try {
            await fetchJson('/save_backtest', {
                method: 'POST',
                body: JSON.stringify({
                    results: rawResults,
                    strategy: selectedStrategy,
                    interval: interval,
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

                {/* Strategy Selection - Button-based */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Strategy</label>
                    <div className="space-y-2">
                        {strategies.map((strategy) => (
                            <button
                                key={strategy.value}
                                onClick={() => setSelectedStrategy(strategy.value)}
                                className={cn(
                                    "w-full p-3 rounded-lg text-left transition-all border-2",
                                    selectedStrategy === strategy.value
                                        ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500"
                                        : "bg-zinc-50 dark:bg-zinc-800 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                )}
                            >
                                <div className={cn(
                                    "font-bold text-sm mb-0.5",
                                    selectedStrategy === strategy.value ? "text-cyan-700 dark:text-cyan-400" : "text-zinc-900 dark:text-white"
                                )}>
                                    {strategy.label}
                                </div>
                                <div className="text-xs text-zinc-500">{strategy.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stock Universe - with search like desktop */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Stock Universe</label>

                    {/* Search Input */}
                    <div className="relative mb-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search stocks (e.g. RELIANCE)"
                                    className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-white min-h-[42px]"
                                />
                            </div>
                        </div>

                        {/* Search Dropdown */}
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 max-h-[200px] overflow-y-auto">
                                {searchResults.map((result, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => addStock(result)}
                                        className="w-full px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                                    >
                                        <div className="font-medium text-sm text-zinc-900 dark:text-white">{result.symbol}</div>
                                        <div className="text-xs text-zinc-500">{result.exchange} • Token: {result.token}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searching && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 p-4 text-center">
                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-zinc-400" />
                            </div>
                        )}
                    </div>

                    {/* Saved Stocks Quick Add */}
                    {savedStocks.length > 0 && (
                        <div className="mb-3">
                            <label className="text-xs text-zinc-500 mb-1.5 block">My Stocklist</label>
                            <div className="flex flex-wrap gap-1.5">
                                {savedStocks.slice(0, 10).map((sym, idx) => {
                                    const isAdded = selectedStocks.some(s => s.symbol === sym);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => !isAdded && addStock({ symbol: sym })}
                                            disabled={isAdded}
                                            className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                                isAdded
                                                    ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 opacity-50"
                                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                                            )}
                                        >
                                            {sym}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons Row */}
                    <div className="flex gap-2 mb-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm min-h-[42px] transition-colors"
                            type="button"
                        >
                            <Upload className="w-4 h-4" />
                            Import CSV
                        </button>

                        <button
                            onClick={() => setSelectedStocks([])}
                            disabled={selectedStocks.length === 0}
                            className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium text-sm min-h-[42px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Selected Stocks */}
                    <div className="flex flex-wrap gap-2">
                        {selectedStocks.map((stock) => (
                            <span
                                key={stock.symbol}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                {stock.symbol}
                                <button
                                    onClick={() => removeStock(stock.symbol)}
                                    className="w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        ))}
                        {selectedStocks.length === 0 && (
                            <p className="text-xs text-zinc-400 italic">Search and add stocks above</p>
                        )}
                    </div>
                </div>

                {/* Date Range with Time Picker */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Date & Time Range</label>
                    <div className="grid grid-cols-1 gap-3">
                        <DateTimePicker
                            label="From Date & Time"
                            value={startDate}
                            onChange={setStartDate}
                        />
                        <DateTimePicker
                            label="To Date & Time"
                            value={endDate}
                            onChange={setEndDate}
                        />
                    </div>
                </div>

                {/* Timeframe Setting (no Initial Capital) */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Settings</label>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Timeframe</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: '5', label: '5 Min' },
                                { value: '15', label: '15 Min' },
                                { value: '30', label: '30 Min' },
                                { value: '60', label: '1 Hour' },
                            ].map((tf) => (
                                <button
                                    key={tf.value}
                                    onClick={() => setInterval(tf.value)}
                                    className={cn(
                                        "px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-2",
                                        interval === tf.value
                                            ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-700 dark:text-cyan-400"
                                            : "bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    )}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
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
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium"
                            >
                                <Save size={14} />
                                Save
                            </button>
                        </div>
                        {results.map((result, index) => {
                            const pnl = parseFloat(result.totalPnL || 0);
                            const isPositive = pnl >= 0;
                            return (
                                <div key={index} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-zinc-900 dark:text-white">{result.symbol}</span>
                                        <span className={cn(
                                            "text-lg font-bold",
                                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                        )}>
                                            {isPositive ? '+' : ''}₹{pnl.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                                            <div className="text-zinc-500 mb-0.5">Trades</div>
                                            <div className="font-bold text-zinc-900 dark:text-white">{result.totalTrades || 0}</div>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                                            <div className="text-zinc-500 mb-0.5">Win Rate</div>
                                            <div className="font-bold text-zinc-900 dark:text-white">{parseFloat(result.winRate || 0).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                                            <div className="text-zinc-500 mb-0.5">Max DD</div>
                                            <div className="font-bold text-zinc-900 dark:text-white">{parseFloat(result.maxDrawdown || 0).toFixed(1)}%</div>
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
