"use client";
import React, { useEffect, useState } from "react";
import { History } from "lucide-react";

function HistoryTable({ user, showConfirm, addToast, fetchJson }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const loadHistory = () => {
        if (!user) {
            setLoading(false);
            return;
        }
        fetchJson('/history')
            .then(data => { setHistory(data); setLoading(false); setCurrentPage(1); })
            .catch(err => {
                console.log("History fetch failed (expected if not logged in)");
                setLoading(false);
            });
    };

    useEffect(() => {
        loadHistory();
    }, [user]);

    const deleteEntry = async (id) => {
        const confirmed = await showConfirm(
            "Delete History Entry",
            "Are you sure you want to permanently delete this backtest result?",
            null,
            "danger"
        );
        if (!confirmed) return;

        try {
            await fetchJson(`/history/${id}`, { method: 'DELETE' });
            addToast("History entry deleted successfully", "success");
            loadHistory();
        } catch (err) {
            addToast('Failed to delete: ' + err.message, "error");
        }
    };

    if (!user) return <div className="p-8 text-center text-zinc-500">Please log in to view history.</div>;
    if (loading) return <div className="p-8 text-center text-zinc-500">Loading history...</div>;

    const formatInterval = (interval) => {
        if (!interval) return 'N/A';
        return interval.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(history.length / itemsPerPage);

    return (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-zinc-200 dark:border-[#27272a] flex items-center justify-between">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2"><History size={18} /> Backtest History</h3>
                <button onClick={loadHistory} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold transition-colors bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>
            {history.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No history found. Run a backtest to save results.</div>
            ) : (
                <div className="flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                            <thead className="bg-zinc-100 dark:bg-[#18181b] uppercase font-bold text-xs text-zinc-500 border-b border-zinc-200 dark:border-[#27272a]">
                                <tr>
                                    <th className="px-4 py-4">Date</th>
                                    <th className="px-4 py-4">Symbol</th>
                                    <th className="px-4 py-4">Timeframe</th>
                                    <th className="px-4 py-4">Date Range</th>
                                    <th className="px-4 py-4">Trades</th>
                                    <th className="px-4 py-4">Win Rate</th>
                                    <th className="px-4 py-4">P&L</th>
                                    <th className="px-4 py-4">Final Cap</th>
                                    <th className="px-4 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                                {currentItems.map((row) => (
                                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-4 py-4 text-xs">{new Date(row.date).toLocaleString()}</td>
                                        <td className="px-4 py-4 font-bold text-zinc-900 dark:text-white">{row.symbol}</td>
                                        <td className="px-4 py-4 text-xs whitespace-nowrap">{formatInterval(row.interval)}</td>
                                        <td className="px-4 py-4 text-xs whitespace-nowrap">
                                            {row.from_date && row.to_date ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-zinc-400 dark:text-zinc-500">{(() => {
                                                        const [d, t] = row.from_date.split(' ');
                                                        if (d.includes('-') && d.split('-')[0].length === 4) {
                                                            const p = d.split('-'); return `${p[2]}-${p[1]}-${p[0]}`;
                                                        }
                                                        return d;
                                                    })()}</span>
                                                    <span className="text-zinc-400 dark:text-zinc-500">to {(() => {
                                                        const [d, t] = row.to_date.split(' ');
                                                        if (d.includes('-') && d.split('-')[0].length === 4) {
                                                            const p = d.split('-'); return `${p[2]}-${p[1]}-${p[0]}`;
                                                        }
                                                        return d;
                                                    })()}</span>
                                                </div>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 font-mono">{row.total_trades || '-'}</td>
                                        <td className="px-4 py-4 font-mono">{row.win_rate}%</td>
                                        <td className={`px-4 py-4 font-mono font-bold ${row.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {row.pnl >= 0 ? '+' : ''}{row.pnl.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 font-mono">{row.final_capital ? row.final_capital.toFixed(2) : '-'}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => deleteEntry(row.id)}
                                                className="text-red-500 hover:text-red-700 dark:text-red-500/80 dark:hover:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-200 dark:border-[#27272a]">
                            <span className="text-sm text-zinc-500">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function HistorySection({ ctx }) {
    const { user, showConfirm, addToast, fetchJson } = ctx;
    return <HistoryTable user={user} showConfirm={showConfirm} addToast={addToast} fetchJson={fetchJson} />;
}
