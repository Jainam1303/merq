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

    const filteredOrders = orders.filter(order => {
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

    if (orders.length === 0) {
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
        <div className="min-h-[calc(100vh-180px)] max-h-[calc(100vh-180px)] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-500" />
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Order Book</h2>
                        </div>
                        <p className="text-xs text-zinc-500">{filteredOrders.length} orders</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadCSV}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                            <Download size={18} />
                        </button>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleDelete}
                                className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
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
                        className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs"
                        placeholder="End Date"
                    />
                </div>

                {/* Select All */}
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                        type="checkbox"
                        checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                    />
                    Select All ({selectedIds.size})
                </label>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {filteredOrders.map((order) => (
                    <div
                        key={order.id}
                        className={cn(
                            "bg-white dark:bg-zinc-900 border rounded-xl p-4 transition-all",
                            selectedIds.has(order.id)
                                ? "border-blue-500 ring-2 ring-blue-500/20"
                                : "border-zinc-200 dark:border-zinc-800"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(order.id)}
                                onChange={() => toggleSelect(order.id)}
                                className="mt-1 rounded"
                            />
                            <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-900 dark:text-white">
                                            {order.symbol}
                                        </span>
                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", getStatusColor(order.status))}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-bold",
                                        order.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                        {order.pnl >= 0 ? '+' : ''}₹{order.pnl.toFixed(2)}
                                    </span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-zinc-500">Entry:</span>
                                        <span className="ml-1 font-medium text-zinc-700 dark:text-zinc-300">₹{order.entry_price}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">Qty:</span>
                                        <span className="ml-1 font-medium text-zinc-700 dark:text-zinc-300">{order.quantity}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">SL:</span>
                                        <span className="ml-1 font-medium text-zinc-700 dark:text-zinc-300">₹{order.sl}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">TP:</span>
                                        <span className="ml-1 font-medium text-zinc-700 dark:text-zinc-300">₹{order.tp}</span>
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="mt-2 text-xs text-zinc-400">
                                    {new Date(order.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
