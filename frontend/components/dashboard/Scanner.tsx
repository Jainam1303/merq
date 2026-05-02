"use client";

import { useState, useEffect, useRef } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import {
    Search,
    Play,
    Loader2,
    Download,
    TrendingUp,
    Sparkles,
    Clock,
    BarChart3,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    RefreshCw,
    Zap
} from "lucide-react";

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

export function Scanner() {
    const [scanners, setScanners] = useState<ScannerMeta[]>([]);
    const [selectedScanner, setSelectedScanner] = useState<string | null>(null);
    const [results, setResults] = useState<ScanResults | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState<ScanProgress | null>(null);
    const [expandedConditions, setExpandedConditions] = useState<string | null>(null);
    const [sortField, setSortField] = useState<string>("sr");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    // Load available scanners on mount
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
            // If Python engine is offline, use fallback definitions
            setScanners([
                {
                    id: "vcp",
                    name: "VCP Scanner",
                    description: "Volatility Contraction Pattern — finds stocks where volatility is shrinking near 52-week highs with bullish EMA alignment. Ideal for swing trading breakouts.",
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

        // Start polling progress
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
                toast.success(`Found ${data.count} stocks matching ${data.scanner} criteria`);
            } else {
                toast.error(data.message || "Scan failed");
            }
        } catch (e: any) {
            toast.error(e.message || "Scanner failed. Check if broker credentials are configured.");
        } finally {
            setIsScanning(false);
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
            setProgress(null);
        }
    };

    const exportCSV = () => {
        if (!results?.stocks?.length) return;

        const headers = Object.keys(results.stocks[0]);
        const csv = [
            headers.join(","),
            ...results.stocks.map(s => headers.map(h => s[h] ?? "").join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${results.scanner_id}_scan_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const sortedStocks = results?.stocks
        ? [...results.stocks].sort((a, b) => {
            const valA = a[sortField] ?? 0;
            const valB = b[sortField] ?? 0;
            const cmp = typeof valA === "string" ? valA.localeCompare(valB) : valA - valB;
            return sortDir === "asc" ? cmp : -cmp;
        })
        : [];

    return (
        <div className="space-y-6">
            {/* Scanner Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanners.map((scanner) => (
                    <div
                        key={scanner.id}
                        className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                            selectedScanner === scanner.id && isScanning
                                ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                                : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                        }`}
                    >
                        {/* Gradient accent */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                            scanner.id === "vcp"
                                ? "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
                                : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                        }`} />

                        <div className="p-5 pt-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                                        scanner.id === "vcp"
                                            ? "bg-violet-500/10 text-violet-500"
                                            : "bg-emerald-500/10 text-emerald-500"
                                    }`}>
                                        {scanner.id === "vcp"
                                            ? <BarChart3 className="w-5 h-5" />
                                            : <Sparkles className="w-5 h-5" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-base">{scanner.name}</h3>
                                        <span className="text-xs text-muted-foreground">{scanner.segment}</span>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                    scanner.id === "vcp"
                                        ? "bg-violet-500/10 text-violet-400"
                                        : "bg-emerald-500/10 text-emerald-400"
                                }`}>
                                    {scanner.condition_count} conditions
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                {scanner.description}
                            </p>

                            {/* Expandable Conditions */}
                            <button
                                onClick={() => setExpandedConditions(
                                    expandedConditions === scanner.id ? null : scanner.id
                                )}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span>View filter conditions</span>
                                {expandedConditions === scanner.id
                                    ? <ChevronUp className="w-3.5 h-3.5" />
                                    : <ChevronDown className="w-3.5 h-3.5" />
                                }
                            </button>

                            {expandedConditions === scanner.id && (
                                <div className="mb-4 space-y-1.5 pl-1">
                                    {scanner.conditions.map((cond, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                            <span className="text-primary mt-0.5">▸</span>
                                            <span className="text-muted-foreground">{cond}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Run Button */}
                            <button
                                onClick={() => runScan(scanner.id)}
                                disabled={isScanning}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isScanning && selectedScanner === scanner.id
                                        ? "bg-blue-500/20 text-blue-400 cursor-not-allowed"
                                        : isScanning
                                            ? "bg-secondary text-muted-foreground cursor-not-allowed"
                                            : scanner.id === "vcp"
                                                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md"
                                }`}
                            >
                                {isScanning && selectedScanner === scanner.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" />
                                        Run Scan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            {isScanning && progress && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span className="text-sm font-medium">
                                Scanning: {progress.symbol || "Loading..."}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{progress.current}/{progress.total} stocks</span>
                            <span className="text-emerald-400">{progress.matches} matches</span>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress.total > 0 ? (progress.current / progress.total * 100) : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Results Section */}
            {results && results.stocks && results.stocks.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Results Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{results.scanner} Results</h3>
                                <p className="text-xs text-muted-foreground">
                                    {results.count} stocks found from {results.total_scanned} scanned
                                    <span className="mx-1.5">•</span>
                                    <Clock className="w-3 h-3 inline" /> {results.scan_time}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => runScan(results.scanner_id)}
                                disabled={isScanning}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                CSV
                            </button>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("sr")}>
                                        #
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("symbol")}>
                                        Symbol
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("close")}>
                                        Close ₹
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("change_pct")}>
                                        Change %
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("volume")}>
                                        Volume
                                    </th>
                                    {results.scanner_id === "vcp" && (
                                        <>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                                onClick={() => handleSort("atr_14")}>
                                                ATR(14)
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                                onClick={() => handleSort("ema50")}>
                                                EMA50
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                                onClick={() => handleSort("pct_from_52w")}>
                                                52W %
                                            </th>
                                        </>
                                    )}
                                    {results.scanner_id === "ipo_base" && (
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                                            onClick={() => handleSort("listing_days")}>
                                            Listed Days
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStocks.map((stock, idx) => (
                                    <tr
                                        key={stock.symbol}
                                        className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-muted-foreground">{stock.sr}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold">{stock.symbol}</span>
                                            {stock.name && (
                                                <span className="block text-xs text-muted-foreground">{stock.name}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                                            ₹{Number(stock.close).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-mono tabular-nums ${
                                            stock.change_pct >= 0 ? "text-emerald-500" : "text-red-500"
                                        }`}>
                                            <span className="inline-flex items-center gap-0.5">
                                                {stock.change_pct >= 0
                                                    ? <ArrowUpRight className="w-3 h-3" />
                                                    : <ArrowDownRight className="w-3 h-3" />
                                                }
                                                {Math.abs(stock.change_pct).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {formatVolume(stock.volume)}
                                        </td>
                                        {results.scanner_id === "vcp" && (
                                            <>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                    {stock.atr_14}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                    ₹{Number(stock.ema50).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${
                                                        stock.pct_from_52w >= 95
                                                            ? "bg-emerald-500/10 text-emerald-400"
                                                            : stock.pct_from_52w >= 85
                                                                ? "bg-yellow-500/10 text-yellow-400"
                                                                : "bg-secondary text-muted-foreground"
                                                    }`}>
                                                        {stock.pct_from_52w}%
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        {results.scanner_id === "ipo_base" && (
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium bg-cyan-500/10 text-cyan-400">
                                                    {stock.listing_days} days
                                                </span>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {results && results.stocks && results.stocks.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Matches Found</h3>
                    <p className="text-sm text-muted-foreground">
                        No stocks matched all {scanners.find(s => s.id === results.scanner_id)?.condition_count} conditions of the {results.scanner} scanner. Try again during market hours for fresh data.
                    </p>
                </div>
            )}
        </div>
    );
}

function formatVolume(vol: number): string {
    if (!vol) return "0";
    if (vol >= 10000000) return (vol / 10000000).toFixed(1) + "Cr";
    if (vol >= 100000) return (vol / 100000).toFixed(1) + "L";
    if (vol >= 1000) return (vol / 1000).toFixed(1) + "K";
    return vol.toString();
}
