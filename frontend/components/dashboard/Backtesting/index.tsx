"use client";
import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/api";
import { Play, Loader2, Save, Trash2, ChevronLeft, ChevronRight, Search, X, ChevronDown } from "lucide-react";
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
    const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
    const [savedStocks, setSavedStocks] = useState<string[]>([]);
    const [stocklistFilter, setStocklistFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleSearch = async () => {
        if (!searchQuery) return;
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
    };

    const addStock = async (stock: any) => {
        if (!selectedStocks.includes(stock.symbol)) {
            setSelectedStocks([...selectedStocks, stock.symbol]);
        }

        // Add to My Stocklist (DB)
        try {
            await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(stock) });
            toast.success("Added to My Stocklist");
            loadSavedStocks();
        } catch (e) { console.error(e); }

        setSearchQuery("");
        setSearchResults([]);
    };

    const removeStock = (symbol: string) => {
        setSelectedStocks(selectedStocks.filter(s => s !== symbol));
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
                symbols: selectedStocks // Send Array of Symbols
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
                <CardHeader><CardTitle>Backtest Configuration</CardTitle></CardHeader>
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
                        <div className="relative">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search stocks (e.g. RELIANCE, TCS)..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    className="flex-1"
                                />
                                <Button variant="secondary" onClick={handleSearch} disabled={searching}>
                                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="min-w-[120px]">
                                            My Stocklist <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[250px]">
                                        <div className="p-2 border-b">
                                            <Input
                                                placeholder="Filter list..."
                                                value={stocklistFilter}
                                                onChange={e => setStocklistFilter(e.target.value)}
                                                className="h-8 text-xs"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {savedStocks.length > 0 ? (
                                                savedStocks
                                                    .filter(s => s.toLowerCase().includes(stocklistFilter.toLowerCase()))
                                                    .slice(0, 50)
                                                    .map(s => (
                                                        <DropdownMenuItem key={s} onClick={() => {
                                                            if (!selectedStocks.includes(s)) {
                                                                setSelectedStocks([...selectedStocks, s]);
                                                                setStocklistFilter("");
                                                            }
                                                        }} className="cursor-pointer text-xs">
                                                            {s}
                                                        </DropdownMenuItem>
                                                    ))
                                            ) : (
                                                <div className="p-2 text-xs text-muted-foreground text-center">No saved stocks</div>
                                            )}
                                            {savedStocks.filter(s => s.toLowerCase().includes(stocklistFilter.toLowerCase())).length === 0 && savedStocks.length > 0 && (
                                                <div className="p-2 text-xs text-muted-foreground text-center">No matches found</div>
                                            )}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button onClick={handleRunBacktest} disabled={running || selectedStocks.length === 0} className="min-w-[130px]">
                                    {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</> : <><Play className="mr-2 h-4 w-4" /> Run Backtest</>}
                                </Button>
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg text-popover-foreground">
                                    {searchResults.map((s) => (
                                        <div
                                            key={s.token}
                                            onClick={() => addStock(s)}
                                            className="flex items-center justify-between px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                                        >
                                            <span className="font-bold">{s.symbol}</span>
                                            <span className="text-xs text-muted-foreground">{s.exchange}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Stocks Chips */}
                        <div className="flex flex-wrap gap-2">
                            {selectedStocks.map(symbol => (
                                <Badge key={symbol} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-sm">
                                    {symbol}
                                    <X
                                        className="h-3 w-3 hover:text-destructive cursor-pointer"
                                        onClick={() => removeStock(symbol)}
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
