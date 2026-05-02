"use client";

import React, { useState, useEffect, useRef } from 'react';
import { fetchJson } from '@/lib/api';
import { toast } from 'sonner';
import {
    Search,
    Play,
    Loader2,
    TrendingUp,
    Sparkles,
    Clock,
    BarChart3,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
    ArrowDownRight,
    Filter
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

interface ScannerMeta {
    id: string;
    name: string;
    description: string;
    conditions: string[];
    condition_count: number;
    segment: string;
}

interface ScanResult {
    sr: number;
    symbol: string;
    name: string;
    close: number;
    volume: number;
    change_pct: number;
    [key: string]: any;
}

interface ScanResults {
    status: string;
    scanner: string;
    scanner_id: string;
    count: number;
    total_scanned: number;
    errors: number;
    scan_time: string;
    stocks: ScanResult[];
}

interface ScanProgress {
    status: string;
    current: number;
    total: number;
    symbol: string;
    matches: number;
}

export function MobileScannerView() {
    const [scanners, setScanners] = useState<ScannerMeta[]>([]);
    const [selectedScanner, setSelectedScanner] = useState<string | null>(null);
    const [results, setResults] = useState<ScanResults | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState<ScanProgress | null>(null);
    const [expandedConditions, setExpandedConditions] = useState<string | null>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadScanners();
    }, []);

    const loadScanners = async () => {
        try {
            const data = await fetchJson("/scanner/list");
            if (data.scanners) {
                setScanners(data.scanners);
            }
        } catch (e) {
            setScanners([
                {
                    id: "vcp",
                    name: "VCP Scanner",
                    description: "Volatility Contraction Pattern — finds stocks where volatility is shrinking near 52-week highs with bullish EMA alignment.",
                    conditions: [
                        "ATR(14) today < ATR(14) 10 days ago",
                        "ATR(14) / Close < 0.08",
                        "Close > 75% of 52-week High",
                        "EMA(50) > EMA(150)",
                        "EMA(150) > EMA(200)",
                        "Close > EMA(50)",
                        "Close > ₹10",
                        "Close × Volume > ₹10,00,000"
                    ],
                    condition_count: 8,
                    segment: "Cash (NSE Equity)"
                },
                {
                    id: "ipo_base",
                    name: "IPO Base Scanner",
                    description: "Finds recently listed stocks (IPOs) with less than 400 trading days that are forming a price base with good volume.",
                    conditions: [
                        "Stock listed < 400 trading days",
                        "Close > ₹50",
                        "Volume > 1,00,000"
                    ],
                    condition_count: 3,
                    segment: "Cash (NSE Equity)"
                }
            ]);
        }
    };

    const runScan = async (scannerId: string) => {
        setIsScanning(true);
        setSelectedScanner(scannerId);
        setResults(null);
        setProgress({ status: "starting", current: 0, total: 50, symbol: "Connecting...", matches: 0 });

        progressInterval.current = setInterval(async () => {
            try {
                const prog = await fetchJson(`/scanner/progress/${scannerId}`);
                if (prog.status === "running" || prog.status === "complete") {
                    setProgress(prog);
                }
            } catch (e) { }
        }, 2000);

        try {
            const data = await fetchJson("/scanner/run", {
                method: "POST",
                body: JSON.stringify({ scanner_id: scannerId })
            });

            if (data.status === "success") {
                setResults(data);
                toast.success(`Found ${data.count} matches`);
            } else {
                toast.error(data.message || "Scan failed");
            }
        } catch (e: any) {
            toast.error(e.message || "Scanner failed. Please check your API keys.");
        } finally {
            setIsScanning(false);
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
            setProgress(null);
        }
    };

    const formatVolume = (vol: number): string => {
        if (!vol) return "0";
        if (vol >= 10000000) return (vol / 10000000).toFixed(1) + "Cr";
        if (vol >= 100000) return (vol / 100000).toFixed(1) + "L";
        if (vol >= 1000) return (vol / 1000).toFixed(1) + "K";
        return vol.toString();
    };

    return (
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 pb-24 h-full">
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="mb-2">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Scanner</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Discover trading opportunities</p>
                </div>

                {/* Scanners List */}
                <div className="space-y-4">
                    {scanners.map((scanner) => (
                        <div
                            key={scanner.id}
                            className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border transition-all ${
                                selectedScanner === scanner.id && isScanning
                                    ? "border-blue-500/50 shadow-blue-500/10"
                                    : "border-zinc-200 dark:border-zinc-800"
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${
                                        scanner.id === "vcp"
                                            ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                                            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    }`}>
                                        {scanner.id === "vcp" ? <BarChart3 size={20} /> : <Sparkles size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{scanner.name}</h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                                            {scanner.condition_count} conditions
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
                                {scanner.description}
                            </p>

                            <button
                                onClick={() => setExpandedConditions(expandedConditions === scanner.id ? null : scanner.id)}
                                className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 mb-3"
                            >
                                <Filter size={12} />
                                {expandedConditions === scanner.id ? "Hide filters" : "View filters"}
                                {expandedConditions === scanner.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            <AnimatePresence>
                                {expandedConditions === scanner.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mb-3"
                                    >
                                        <div className="space-y-1 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                            {scanner.conditions.map((c, i) => (
                                                <div key={i} className="flex items-start gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                                                    <span className="text-zinc-400 mt-0.5">•</span>
                                                    <span>{c}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => runScan(scanner.id)}
                                disabled={isScanning}
                                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                    isScanning && selectedScanner === scanner.id
                                        ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                        : isScanning
                                            ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                                            : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 active:scale-95"
                                }`}
                            >
                                {isScanning && selectedScanner === scanner.id ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Scanning Market...
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} className="fill-current" />
                                        Run Scan
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Progress Indicator */}
                <AnimatePresence>
                    {isScanning && progress && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 border border-blue-100 dark:border-blue-500/20"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                    <Loader2 size={12} className="animate-spin" />
                                    {progress.symbol || "Scanning..."}
                                </span>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {progress.matches} matches
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total * 100) : 0}%` }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scan Results */}
                <AnimatePresence>
                    {results && !isScanning && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                        >
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                                <div>
                                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                                        <TrendingUp size={16} className="text-emerald-500" />
                                        {results.scanner}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        {results.count} stocks found • {results.scan_time.split(' ')[1]}
                                    </p>
                                </div>
                            </div>

                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {results.stocks.length > 0 ? (
                                    results.stocks.map((stock) => (
                                        <div key={stock.symbol} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-bold text-sm text-zinc-900 dark:text-white">{stock.symbol}</span>
                                                    <span className="block text-[10px] text-zinc-500 line-clamp-1">{stock.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                                                        ₹{stock.close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <div className={`flex items-center justify-end gap-0.5 text-[11px] font-bold ${
                                                        stock.change_pct >= 0 ? "text-emerald-500" : "text-red-500"
                                                    }`}>
                                                        {stock.change_pct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                        {Math.abs(stock.change_pct).toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                    Vol: {formatVolume(stock.volume)}
                                                </span>
                                                
                                                {results.scanner_id === "vcp" && (
                                                    <>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                            ATR: {stock.atr_14}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            stock.pct_from_52w >= 95 
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                                                        }`}>
                                                            {stock.pct_from_52w}% 52W High
                                                        </span>
                                                    </>
                                                )}
                                                {results.scanner_id === "ipo_base" && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400">
                                                        {stock.listing_days} Days Old
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No matches</p>
                                        <p className="text-xs text-zinc-500 mt-1">Try again during market hours</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
