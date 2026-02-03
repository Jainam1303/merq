"use client";
import React, { useState } from 'react';
import { X, AlertTriangle, TrendingUp, TrendingDown, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Trade {
    id: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    qty: number;
    entry: number;
    tp: number;
    sl: number;
    pnl: number;
    time: string;
}

interface MobileTradesViewProps {
    trades: Trade[];
    onExitTrade: (id: string) => void;
    onUpdateTrade: (id: string, tp: number, sl: number) => void;
    onSquareOffAll: () => void;
    totalPnl: number;
}

function TradeCard({
    trade,
    onExit,
    onUpdate,
    expanded,
    onToggleExpand
}: {
    trade: Trade;
    onExit: () => void;
    onUpdate: (tp: number, sl: number) => void;
    expanded: boolean;
    onToggleExpand: () => void;
}) {
    const [confirmExit, setConfirmExit] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editTP, setEditTP] = useState(trade.tp.toString());
    const [editSL, setEditSL] = useState(trade.sl.toString());

    const handleExitPress = () => {
        if (confirmExit) {
            onExit();
            setConfirmExit(false);
        } else {
            setConfirmExit(true);
            setTimeout(() => setConfirmExit(false), 3000);
        }
    };

    const handleSaveEdit = () => {
        onUpdate(parseFloat(editTP) || trade.tp, parseFloat(editSL) || trade.sl);
        setEditing(false);
    };

    const isProfitable = (Number(trade.pnl) || 0) >= 0;

    return (
        <div className={cn(
            "rounded-xl border transition-all duration-200 overflow-hidden",
            isProfitable
                ? "border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-zinc-900"
                : "border-red-200 dark:border-red-800/50 bg-white dark:bg-zinc-900"
        )}>
            {/* Main Card Content - Always Visible */}
            <button
                onClick={onToggleExpand}
                className="w-full p-4 text-left flex items-center gap-3"
            >
                {/* Symbol & Type */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-white">{trade.symbol}</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            trade.type === 'BUY'
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                            {trade.type}
                        </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                        {trade.qty} @ ₹{Number(trade.entry || 0).toFixed(2)} • {trade.time}
                    </div>
                </div>

                {/* P&L */}
                <div className="text-right">
                    <div className={cn(
                        "text-lg font-bold tabular-nums",
                        isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}>
                        {isProfitable ? '+' : ''}₹{Number(trade.pnl || 0).toFixed(2)}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-zinc-400">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
            </button>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    {/* TP/SL Display or Edit */}
                    {editing ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Take Profit</label>
                                    <input
                                        type="number"
                                        value={editTP}
                                        onChange={(e) => setEditTP(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-mono text-sm"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Stop Loss</label>
                                    <input
                                        type="number"
                                        value={editSL}
                                        onChange={(e) => setEditSL(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-mono text-sm"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex-1 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 py-2 rounded-lg bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-1"
                                >
                                    <Check size={16} /> Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                                <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                                    <div className="text-[10px] text-zinc-500 uppercase">TP</div>
                                    <div className="font-mono text-emerald-600 dark:text-emerald-400">₹{Number(trade.tp || 0).toFixed(2)}</div>
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/10">
                                    <div className="text-[10px] text-zinc-500 uppercase">SL</div>
                                    <div className="font-mono text-red-600 dark:text-red-400">₹{Number(trade.sl || 0).toFixed(2)}</div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            >
                                <Edit2 size={18} />
                            </button>
                        </div>
                    )}

                    {/* Exit Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleExitPress(); }}
                        className={cn(
                            "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 min-h-[48px] transition-all",
                            confirmExit
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        )}
                    >
                        <X size={18} />
                        {confirmExit ? 'TAP AGAIN TO EXIT' : 'Exit Position'}
                    </button>
                </div>
            )}
        </div>
    );
}

export function MobileTradesView({
    trades,
    onExitTrade,
    onUpdateTrade,
    onSquareOffAll,
    totalPnl,
}: MobileTradesViewProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [confirmSquareOff, setConfirmSquareOff] = useState(false);

    const handleSquareOffAll = () => {
        if (confirmSquareOff) {
            onSquareOffAll();
            setConfirmSquareOff(false);
        } else {
            setConfirmSquareOff(true);
            setTimeout(() => setConfirmSquareOff(false), 3000);
        }
    };

    if (trades.length === 0) {
        return (
            <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No Active Positions</h3>
                <p className="text-sm text-zinc-500">
                    When you have open trades, they'll appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-180px)] flex flex-col pb-4">
            {/* Summary Header */}
            <div className="sticky top-16 z-10 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-zinc-500">{trades.length} Position{trades.length !== 1 ? 's' : ''}</div>
                        <div className={cn(
                            "text-xl font-bold tabular-nums",
                            (Number(totalPnl) || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {(Number(totalPnl) || 0) >= 0 ? '+' : ''}₹{Number(totalPnl || 0).toFixed(2)}
                        </div>
                    </div>
                    {trades.length > 0 && (
                        <button
                            onClick={handleSquareOffAll}
                            className={cn(
                                "px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 min-h-[44px] transition-all",
                                confirmSquareOff
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            )}
                        >
                            <AlertTriangle size={16} />
                            {confirmSquareOff ? 'CONFIRM' : 'Exit All'}
                        </button>
                    )}
                </div>
            </div>

            {/* Trade Cards */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {trades.map((trade) => (
                    <TradeCard
                        key={trade.id}
                        trade={trade}
                        expanded={expandedId === trade.id}
                        onToggleExpand={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                        onExit={() => onExitTrade(trade.id)}
                        onUpdate={(tp, sl) => onUpdateTrade(trade.id, tp, sl)}
                    />
                ))}
            </div>
        </div>
    );
}
