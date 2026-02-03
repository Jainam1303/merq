"use client";
import { useState, useEffect, useRef } from "react";
import { fetchJson } from "@/lib/api";
import { Play, Loader2, Save, Trash2, ChevronLeft, ChevronRight, Search, X, ChevronDown, Upload, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { stockOptions, timeframeOptions } from "@/data/mockData";

const strategies = [
    { label: "ORB (Opening Range Breakout)", value: "orb" },
    { label: "EMA 8-30 Crossover", value: "ema" }
];

export function Backtesting() {
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<any>(null); // Last run result summary
    const [rawResults, setRawResults] = useState<any[]>([]); // Full result data for saving

    const [formData, setFormData] = useState({
        strategy: 'ORB',
        interval: '5',
        capital: 100000,
        from_date: '2025-01-01',
        to_date: '2025-03-01'
    });
    const [selectedStocks, setSelectedStocks] = useState<any[]>([]);
    const [savedStocks, setSavedStocks] = useState<string[]>([]);
    const [stocklistFilter, setStocklistFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Simple string parse from CSV - we won't have tokens for these unfortunately
            // Unless we lookup? For now, we'll store as string and let backend fallback or fail.
            // Better: Store as partial object { symbol: "..." }
            const symbols = text
                .split(/[\n,]+/)
                .map(s => s.trim().toUpperCase())
                .filter(s => s && s.length > 2);

            if (symbols.length > 0) {
                // Filter out duplicates based on symbol
                const existing = new Set(selectedStocks.map(s => s.symbol));
                const newItems = symbols
                    .filter(s => !existing.has(s))
                    .map(s => ({ symbol: s, token: null, exchange: 'NSE' })); // Token null indicates backend must lookup

                setSelectedStocks([...selectedStocks, ...newItems]);
                toast.success(`Imported ${symbols.length} symbols`);
            } else {
                toast.error("No valid symbols found in CSV");
            }
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Debounced Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setSearching(true);
                try {
                    const res = await fetchJson(`/search_scrip?q=${searchQuery}`);
                    setSearchResults(res || []);
                } catch (e) {
                    console.error(e);
                    setSearchResults([]);
                } finally {
                    setSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const addStock = async (stock: any) => {
        if (!selectedStocks.some(s => s.symbol === stock.symbol)) {
            // Ensure we store the token!
            setSelectedStocks([...selectedStocks, {
                symbol: stock.symbol,
                token: stock.token,
                exchange: stock.exchange || 'NSE'
            }]);
        }

        // Add to My Stocklist (DB) - API expects object
        try {
            await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(stock) });
            toast.success("Added to My Stocklist");
            loadSavedStocks();
        } catch (e) { console.error(e); }

        setSearchQuery("");
        setSearchResults([]);
    };

    const removeStock = (symbol: string) => {
        setSelectedStocks(selectedStocks.filter(s => s.symbol !== symbol));
    };

    useEffect(() => {
        loadSavedStocks();
    }, []);

    const loadSavedStocks = async () => {
        try {
            const res = await fetchJson('/symbols');
            setSavedStocks(res || []);
        } catch (e) { console.error(e); }
    };



    const handleRunBacktest = async () => {
        if (selectedStocks.length === 0) { toast.error("Select at least one stock"); return; }
        setRunning(true);
        try {
            const payload = {
                ...formData,
                symbols: selectedStocks // Now sends Array of Objects { symbol, token, ... }
            };
            console.log('[Backtest] Sending payload:', payload);
            const res = await fetchJson('/backtest', { method: 'POST', body: JSON.stringify(payload) });
            console.log('[Backtest] Response:', res);

            if (res.status === 'success' && res.results && res.results.length > 0) {
                setRawResults(res.results);
                const r = res.results[0];
                console.log('[Backtest] First result:', r);
                const pnl = parseFloat((r['Total P&L'] || '0').toString().replace(/,/g, '').replace(/%/g, ''));
                const winRate = parseFloat((r['Win Rate %'] || '0').toString().replace(/%/g, ''));

                setResults({
                    totalTrades: r['Total Trades'],
                    winRate: winRate,
                    totalPnl: pnl,
                    finalCapital: r['Final Capital']
                });
                toast.success("Backtest completed");
            } else {
                console.log('[Backtest] No results or error:', res);
                toast.error(res.message || "No results returned");
            }
        } catch (e: any) {
            console.error('[Backtest] Error:', e);
            toast.error(e.message || "Backtest failed");
        } finally { setRunning(false); }
    };

    const handleSaveResult = async () => {
        if (!rawResults || rawResults.length === 0) return;
        try {
            await fetchJson('/save_backtest', {
                method: 'POST', body: JSON.stringify({
                    results: rawResults,
                    strategy: formData.strategy,
                    interval: formData.interval,
                    fromDate: formData.from_date,
                    toDate: formData.to_date
                })
            });
            toast.success("Result Saved to History");
        } catch (e) { toast.error("Save failed"); }
    };



    return (
        <div className="space-y-6">
            {/* Configuration Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle>Backtest Configuration</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 text-muted-foreground"
                        onClick={() => {
                            const csvContent = "RELIANCE\nTCS\nINFY\nHDFCBANK";
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'sample_backtest_stocks.csv';
                            a.click();
                            window.URL.revokeObjectURL(url);
                        }}
                    >
                        <Download className="h-4 w-4" />
                        Sample CSV
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <Label>Strategy</Label>
                            <Select value={formData.strategy} onValueChange={v => setFormData({ ...formData, strategy: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{strategies.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Interval</Label>
                            <Select value={formData.interval} onValueChange={v => setFormData({ ...formData, interval: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{timeframeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>From Date</Label>
                            <Input type="date" value={formData.from_date} onChange={e => setFormData({ ...formData, from_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>To Date</Label>
                            <Input type="date" value={formData.to_date} onChange={e => setFormData({ ...formData, to_date: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Stock Selection (Multi-Select)</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search stocks (e.g. RELIANCE, TCS)..."
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        if (e.target.value.trim().length > 0) setShowDropdown(true);
                                    }}
                                    onFocus={() => {
                                        if (searchQuery.trim().length > 0) setShowDropdown(true);
                                    }}
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                    className="pl-9 min-h-[44px]"
                                />
                                {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}

                                {/* Unified Dropdown */}
                                {showDropdown && searchQuery.trim().length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg text-popover-foreground">
                                        {(() => {
                                            const localMatches = savedStocks.filter(s =>
                                                !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase())
                                            );
                                            const showLocal = localMatches.length > 0;
                                            const localSet = new Set(localMatches.map(s => s));
                                            const uniqueApiResults = searchResults.filter(r => !localSet.has(r.symbol));

                                            if (!showLocal && uniqueApiResults.length === 0 && searchQuery.length >= 2 && !searching) {
                                                return <div className="p-3 text-sm text-center text-muted-foreground">No stocks found</div>;
                                            }

                                            return (
                                                <>
                                                    {/* Local Matches */}
                                                    {showLocal && (
                                                        <div className="mb-1">
                                                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-accent/50">My Stocklist</div>
                                                            {localMatches.slice(0, 50).map(s => (
                                                                <div
                                                                    key={`local-${s}`}
                                                                    onClick={() => {
                                                                        // Local saved list is just string[] for now (simple cache)
                                                                        // But to get Token, we usually need the full object.
                                                                        // ISSUE: 'savedStocks' is string[] so we don't have tokens for these unless we lookup.
                                                                        // If the user clicks a "Saved" stock, we must treat it as having unknown token unless we re-fetch.
                                                                        // For now, pass null token, backend will fallback.
                                                                        // Ideally, savedStocks should be objects too.
                                                                        addStock({ symbol: s, token: null, exchange: 'NSE' });
                                                                    }}
                                                                    className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                                                                >
                                                                    <span className="font-medium">{s}</span>
                                                                    <span className="text-xs text-muted-foreground">Saved</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* API Results */}
                                                    {uniqueApiResults.length > 0 && (
                                                        <div>
                                                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-accent/50">Global Search</div>
                                                            {uniqueApiResults.map(s => (
                                                                <div
                                                                    key={`api-${s.token || s.symbol}`}
                                                                    onClick={() => addStock(s)}
                                                                    className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                                                                >
                                                                    <span className="font-bold">{s.symbol}</span>
                                                                    <span className="text-xs text-muted-foreground">{s.exchange || 'NSE'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    variant="outline"
                                    className="h-11 gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Import CSV"
                                >
                                    <Upload className="h-4 w-4" />
                                    <span className="hidden sm:inline">Import CSV</span>
                                </Button>

                                <Button
                                    onClick={handleRunBacktest}
                                    disabled={running || selectedStocks.length === 0}
                                    className="h-11 min-w-[130px]"
                                >
                                    {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</> : <><Play className="mr-2 h-4 w-4" /> Run Backtest</>}
                                </Button>
                            </div>
                        </div>

                        {/* Selected Stocks Chips */}
                        <div className="flex flex-wrap gap-2">
                            {selectedStocks.map(stock => (
                                <Badge key={stock.symbol} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-sm">
                                    {stock.symbol}
                                    <X
                                        className="h-3 w-3 hover:text-destructive cursor-pointer"
                                        onClick={() => removeStock(stock.symbol)}
                                    />
                                </Badge>
                            ))}
                            {selectedStocks.length === 0 && <span className="text-sm text-muted-foreground italic">No stocks selected</span>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Section */}
            {rawResults && rawResults.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <CardTitle>Results</CardTitle>
                        <Button onClick={handleSaveResult} variant="outline" size="sm" className="gap-2">
                            <Save className="h-4 w-4" /> Save to History
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-muted-foreground font-semibold">SYMBOL</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-center">TRADES</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-center">WIN RATE</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-right">P&L</TableHead>
                                        <TableHead className="text-muted-foreground font-semibold text-right">FINAL CAP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rawResults.map((r: any, index: number) => {
                                        const pnl = parseFloat((r['Total P&L'] || '0').toString().replace(/,/g, '').replace(/%/g, ''));
                                        const winRate = parseFloat((r['Win Rate %'] || '0').toString().replace(/%/g, ''));
                                        return (
                                            <TableRow key={index} className="border-border">
                                                <TableCell className="font-bold">{r['Symbol'] || r['symbol'] || '-'}</TableCell>
                                                <TableCell className="text-center">{r['Total Trades'] || '0'}</TableCell>
                                                <TableCell className="text-center">{winRate.toFixed(2)}%</TableCell>
                                                <TableCell className={`text-right font-mono font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {pnl >= 0 ? '' : ''}{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {parseFloat(r['Final Capital'] || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}


        </div>
    );
}
