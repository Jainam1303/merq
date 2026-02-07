"use client";
import React, { useState } from 'react';
import { BookOpen, Download, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
    id: string;
    symbol: string;
    entry_price: number;
    quantity: number;
    sl: number;
    tp: number;
    status: 'filled' | 'pending' | 'cancelled';
    pnl: number;
    timestamp: string;
}

interface MobileOrderBookViewProps {
    orders?: Order[];
    onDeleteOrders?: (ids: string[]) => void;
}

export function MobileOrderBookView({
    orders = [],
    onDeleteOrders
}: MobileOrderBookViewProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Ensure orders is always an array
    const safeOrders = Array.isArray(orders) ? orders : [];

    const filteredOrders = safeOrders.filter(order => {
        if (!startDate && !endDate) return true;
        const orderDate = new Date(order.timestamp);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && orderDate < start) return false;
        if (end && orderDate > end) return false;
        return true;
    });

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
        if (selectedIds.size === filteredOrders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredOrders.map(o => o.id)));
        }
    };

    const handleDownloadCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            "ID,Symbol,Entry,Qty,SL,TP,Status,PnL,Time\n" +
            filteredOrders.map(row =>
                `${row.id},${row.symbol},${row.entry_price},${row.quantity},${row.sl},${row.tp},${row.status},${row.pnl},${row.timestamp}`
            ).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "orderbook.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = () => {
        if (selectedIds.size > 0 && onDeleteOrders) {
            onDeleteOrders(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const getStatusIcon = (status: Order['status']) => {
        switch (status) {
            case 'filled': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-amber-500" />;
        }
    };

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'filled': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
            case 'cancelled': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
            default: return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
        }
    };

    if (safeOrders.length === 0) {
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
                        <p className="text-xs text-zinc-500">{filteredOrders.length} orders found</p>
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
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-blue-500"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-blue-500"
                        placeholder="End Date"
                    />
                </div>

                {/* Select All */}
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500"
                    />
                    Select All ({selectedIds.size})
                </label>
            </div>

            {/* Orders List - Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {filteredOrders.map((order) => {
                    const isSelected = selectedIds.has(order.id);
                    return (
                        <div
                            key={order.id}
                            onClick={() => toggleSelect(order.id)}
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
                                            {order.symbol}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                                            getStatusColor(order.status).replace('text-', 'bg-opacity-10 text-')
                                        )}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-bold font-mono",
                                        (Number(order.pnl) || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                        {(Number(order.pnl) || 0) >= 0 ? '+' : ''}{(Number(order.pnl) || 0).toFixed(2)}
                                    </span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-4 gap-2 text-xs border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3">
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">Entry</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{order.entry_price}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">Qty</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{order.quantity}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">SL</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{order.sl}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 mb-0.5">TP</div>
                                        <div className="font-medium text-zinc-900 dark:text-white">{order.tp}</div>
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                                    <Clock size={10} />
                                    {new Date(order.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
