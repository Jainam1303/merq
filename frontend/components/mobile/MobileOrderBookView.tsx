"use client";
import React, { useState, useEffect } from 'react';
import { BookOpen, Download, Trash2, CheckCircle, XCircle, Clock, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchJson } from '@/lib/api';
import { toast } from 'sonner';

interface Trade {
    id: string;
    date: string;
    time: string;
    symbol: string;
    type: string;
    qty: number;
    entry: number;
    tp: number;
    sl: number;
    exit: number;
    pnl: number;
    status: string;
    is_simulated: boolean;
}

interface MobileOrderBookViewProps {
    // These props are kept for backward compatibility but we also fetch directly
    orders?: any[];
    onDeleteOrders?: (ids: string[]) => void;
}

export function MobileOrderBookView({
    orders: propOrders,
    onDeleteOrders
}: MobileOrderBookViewProps) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Fetch orders from backend - same logic as desktop OrderBook
    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const url = `/orderbook${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetchJson(url);

            if (res.status === 'success') {
                const mapped = res.data.map((t: any) => {
                    let exitPrice = 0;
                    // Try direct exit_price from DB first
                    if (t.exit_price && parseFloat(t.exit_price) > 0) {
                        exitPrice = parseFloat(t.exit_price);
                    } else if (t.exit && parseFloat(t.exit) > 0) {
                        exitPrice = parseFloat(t.exit);
                    } else if (t.status === 'COMPLETED' || t.status === 'CLOSED' || t.status === 'CLOSED_SL' || t.status === 'CLOSED_TP' || t.status === 'CLOSED_MANUAL' || t.pnl !== 0) {
                        const pnl = parseFloat(t.pnl || 0);
                        const qty = parseInt(t.quantity || t.qty || 1);
                        const entry = parseFloat(t.entry_price || t.entry || 0);
                        if (qty > 0 && entry > 0) {
                            if (t.mode === 'BUY' || t.type === 'BUY') exitPrice = entry + (pnl / qty);
                            else exitPrice = entry - (pnl / qty);
                        }
                    }

                    const dateStr = t.date || '';
                    const timeStr = t.time || '';

                    return {
                        id: String(t.id),
                        date: dateStr,
                        time: timeStr,
                        symbol: t.symbol,
                        type: t.mode || t.type,
                        qty: parseInt(t.quantity || t.qty || 0),
                        entry: parseFloat(t.entry_price || t.entry || 0),
                        tp: parseFloat(t.tp || 0),
                        sl: parseFloat(t.sl || 0),
                        exit: exitPrice,
                        pnl: parseFloat(t.pnl || 0),
                        status: (t.status === 'COMPLETED' || t.status === 'CLOSED') ? 'CLOSED' :
                            t.status === 'CANCELLED' ? 'Cancelled' :
                                t.status === 'CLOSED_SL' ? 'CLOSED' :
                                    t.status === 'CLOSED_TP' ? 'CLOSED' :
                                        t.status === 'CLOSED_MANUAL' ? 'CLOSED' : t.status,
                        is_simulated: t.is_simulated === true || t.trade_mode === 'PAPER'
                    };
                });
                setTrades(mapped);
            }
        } catch (e) {
            console.error("Failed to fetch orders", e);
            toast.error("Failed to fetch order book");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on mount and when date filters change
    useEffect(() => {
        fetchOrders();
    }, [startDate, endDate]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    const filteredTrades = trades;

    const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
    const paginatedTrades = filteredTrades.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedTrades.length && paginatedTrades.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedTrades.map(o => o.id)));
        }
    };

    const handleDownloadCSV = () => {
        if (filteredTrades.length === 0) {
            toast.error("No trades to export");
            return;
        }

        const headers = ['Date', 'Time', 'Symbol', 'Type', 'Qty', 'Entry', 'TP', 'SL', 'Exit', 'P&L', 'Status'];
        const rows = filteredTrades.map(t => [
            t.date, t.time, `"${t.symbol}"`, t.type, t.qty, t.entry, t.tp, t.sl, t.exit, t.pnl, t.status
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orderbook_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredTrades.length} trades to CSV`);
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            const ids = Array.from(selectedIds);
            const res = await fetchJson('/delete_orders', {
                method: 'POST',
                body: JSON.stringify({ order_ids: ids })
            });
            if (res.status === 'success') {
                toast.success(`Deleted ${ids.length} order(s)`);
                setTrades(trades.filter(t => !ids.includes(t.id)));
                setSelectedIds(new Set());
            } else {
                toast.error('Failed to delete orders');
            }
        } catch (err) {
            toast.error('Failed to delete orders');
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed' || s.startsWith('closed')) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
        if (s === 'cancelled') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    };

    const getStatusIcon = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed' || s.startsWith('closed')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        if (s === 'cancelled') return <XCircle className="w-4 h-4 text-red-500" />;
        return <Clock className="w-4 h-4 text-amber-500" />;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-4" />
                    <p className="text-zinc-500">Loading orders...</p>
                </div>
            </div>
        );
    }

    // Empty state
    if (trades.length === 0) {
        return (
            <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
                <div className="text-center">
                    <BookOpen className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                        No Orders Yet
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Your order history will appear here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
            {/* Controls Header - Sticky inside the view */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-zinc-500">{filteredTrades.length} orders found</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadCSV}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 active:scale-95"
                        >
                            <Download size={18} />
                        </button>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleDelete}
                                className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 active:scale-95"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>


                {/* Date Filters */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-zinc-900 dark:text-white transition-all"
                            placeholder="Start Date"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-zinc-900 dark:text-white transition-all"
                            placeholder="End Date"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                </div>

                {/* Select All */}
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedTrades.length && paginatedTrades.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500"
                    />
                    Select All ({selectedIds.size})
                </label>
            </div>

            {/* Orders List - Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {paginatedTrades.map((trade) => {
                    const isSelected = selectedIds.has(trade.id);
                    return (
                        <div
                            key={trade.id}
                            onClick={() => toggleSelect(trade.id)}
                            className={cn(
                                "bg-white dark:bg-zinc-900 border rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden",
                                isSelected
                                    ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                                    : "border-zinc-200 dark:border-zinc-800"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute top-0 right-0 w-6 h-6 bg-blue-500 rounded-bl-xl flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-900 dark:text-white text-base">
                                            {trade.symbol}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            trade.type === 'BUY' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                        )}>
                                            {trade.type}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            trade.is_simulated
                                                ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                                                : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                        )}>
                                            {trade.is_simulated ? 'PAPER' : 'LIVE'}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                            getStatusColor(trade.status)
                                        )}>
                                            {trade.status}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-bold font-mono",
                                        trade.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                        {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
                                    </span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-4 gap-2 text-xs border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3">
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">Entry</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{trade.entry.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">Exit</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{trade.exit.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">SL</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{trade.sl.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">TP</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{trade.tp.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Qty + Timestamp */}
                                <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-2">
                                    <span>Qty: <span className="font-medium text-zinc-600 dark:text-zinc-300">{trade.qty}</span></span>
                                    <div className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {trade.date} {trade.time}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls - Fixed Bottom */}
            {totalPages > 1 && (
                <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-medium text-zinc-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
