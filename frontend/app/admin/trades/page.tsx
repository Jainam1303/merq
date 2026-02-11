"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download, Filter, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function TradesPage() {
    const [trades, setTrades] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user_id: "",
        symbol: "",
        startDate: "",
        endDate: "",
        status: "all",
        mode: "all"
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadTrades = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: "50",
                ...filters
            });
            // Remove empty filters
            if (filters.status === 'all') query.delete('status');
            if (filters.mode === 'all') query.delete('mode');

            const res = await fetchJson(`/api/admin/trades?${query.toString()}`);
            setTrades(res.trades);
            setStats(res.stats);
            setTotalPages(res.totalPages);
        } catch (e: any) {
            toast.error("Failed to load trades");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTrades(); }, [page]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters({ ...filters, [key]: value });
    };

    const handleApplyFilters = () => {
        setPage(1);
        loadTrades();
    };

    const handleExport = () => {
        const query = new URLSearchParams(filters);
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/admin/trades/export?${query.toString()}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Global Order Book</h1>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Total Trades</span>
                    <span className="text-2xl font-bold">{stats.total || 0}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Total P&L</span>
                    <span className={`text-2xl font-bold ${stats.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        ₹{stats.total_pnl?.toFixed(2) || '0.00'}
                    </span>
                </Card>
                <Card className="p-4 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Win Rate</span>
                    <span className="text-2xl font-bold text-blue-500">{stats.win_rate || '0.0'}%</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Live vs Paper</span>
                    <span className="text-lg font-medium">
                        <span className="text-blue-500">{trades.filter(t => !t.is_simulated).length} Live</span>
                        {' / '}
                        <span className="text-yellow-500">{trades.filter(t => t.is_simulated).length} Paper</span>
                    </span>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border">
                <div className="w-40">
                    <span className="text-xs font-medium mb-1 block">Symbol</span>
                    <Input placeholder="e.g. NIFTY" value={filters.symbol} onChange={(e) => handleFilterChange('symbol', e.target.value)} />
                </div>
                <div className="w-40">
                    <span className="text-xs font-medium mb-1 block">Status</span>
                    <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-40">
                    <span className="text-xs font-medium mb-1 block">Mode</span>
                    <Select value={filters.mode} onValueChange={(v) => handleFilterChange('mode', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="paper">Paper</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-40">
                    <span className="text-xs font-medium mb-1 block">Start Date</span>
                    <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
                </div>
                <div className="w-40">
                    <span className="text-xs font-medium mb-1 block">End Date</span>
                    <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
                </div>
                <Button onClick={handleApplyFilters}><Filter className="mr-2 h-4 w-4" /> Filter</Button>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Side</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Entry</TableHead>
                            <TableHead>Exit</TableHead>
                            <TableHead>P&L</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={10} className="text-center h-24">Loading trades...</TableCell></TableRow>
                        ) : trades.length === 0 ? (
                            <TableRow><TableCell colSpan={10} className="text-center h-24">No trades found matching filters.</TableCell></TableRow>
                        ) : (
                            trades.map((t) => (
                                <TableRow key={t.id} className={t.is_simulated ? "bg-muted/30" : ""}>
                                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                        {t.timestamp || new Date(t.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{t.username}</TableCell>
                                    <TableCell className="font-bold text-xs">{t.symbol}</TableCell>
                                    <TableCell>
                                        <Badge variant={t.mode === 'BUY' ? 'default' : 'destructive'} className="text-[10px] scale-90">
                                            {t.mode}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                            {t.is_simulated ? "PAPER" : "LIVE"}
                                        </span>
                                    </TableCell>
                                    <TableCell>{t.quantity}</TableCell>
                                    <TableCell>{t.entry_price}</TableCell>
                                    <TableCell>{t.exit_price || '-'}</TableCell>
                                    <TableCell className={`font-bold ${t.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {t.pnl?.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] scale-90">{t.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span>Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
        </div>
    );
}
