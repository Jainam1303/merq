"use client";
import React from "react";
import { BookOpen, Download, Trash2 } from "lucide-react";

export default function OrderBookSection({ ctx, components }) {
    const {
        orderBook,
        obFilters,
        setObFilters,
        selectedObIds,
        setSelectedObIds,
        handleDeleteOrders,
        obPage,
        setObPage,
        currentObItems,
        totalObPages
    } = ctx;

    const { CustomDateInput } = components;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-[#27272a] flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-2"><BookOpen size={20} className="text-purple-500" /> Order Book</h2>
                        <p className="text-zinc-500 text-sm">Comprehensive ledger of all algorithmic trades.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <CustomDateInput value={obFilters.startDate} onChange={e => setObFilters({ ...obFilters, startDate: e.target.value })} placeholder="Start Date" />
                            <span className="text-zinc-400 font-bold">-</span>
                            <CustomDateInput value={obFilters.endDate} onChange={e => setObFilters({ ...obFilters, endDate: e.target.value })} placeholder="End Date" />
                        </div>
                        <button onClick={() => {
                            const csvContent = "data:text/csv;charset=utf-8," + "ID,Symbol,Entry,Qty,SL,TP,Status,PnL,Time\n" + orderBook.map(row => `${row.id},${row.symbol},${row.entry_price},${row.quantity},${row.sl},${row.tp},${row.status},${row.pnl},${row.timestamp}`).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", "orderbook.csv");
                            document.body.appendChild(link);
                            link.click();
                        }} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-bold text-xs hover:opacity-90 transition-opacity">
                            <Download size={14} /> Download CSV
                        </button>
                        {selectedObIds.size > 0 && (
                            <button onClick={handleDeleteOrders} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors">
                                <Trash2 size={14} /> Delete ({selectedObIds.size})
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 dark:bg-[#18181b] text-zinc-500 font-bold uppercase text-xs border-b border-zinc-200 dark:border-[#27272a]">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input type="checkbox"
                                        checked={currentObItems.length > 0 && currentObItems.every(i => selectedObIds.has(i.id))}
                                        onChange={() => {
                                            const newSet = new Set(selectedObIds);
                                            if (currentObItems.every(i => newSet.has(i.id))) {
                                                currentObItems.forEach(i => newSet.delete(i.id));
                                            } else {
                                                currentObItems.forEach(i => newSet.add(i.id));
                                            }
                                            setSelectedObIds(newSet);
                                        }}
                                        className="rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Mode</th>
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Qty</th>
                                <th className="px-6 py-4">TP</th>
                                <th className="px-6 py-4">SL</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                            {currentObItems.map((row, i) => (
                                <tr key={i} className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${selectedObIds.has(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input type="checkbox"
                                            checked={selectedObIds.has(row.id)}
                                            onChange={() => {
                                                const newSet = new Set(selectedObIds);
                                                if (newSet.has(row.id)) newSet.delete(row.id);
                                                else newSet.add(row.id);
                                                setSelectedObIds(newSet);
                                            }}
                                            className="rounded border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">#{row.id}</td>
                                    <td className="px-6 py-4 text-zinc-500 text-xs text-nowrap">
                                        {(() => {
                                            try {
                                                const [datePart, timePart] = row.timestamp.split(' ');
                                                const [y, m, d] = datePart.split('-');
                                                return `${d}-${m}-${y} ${timePart ? timePart.split('.')[0] : ''}`;
                                            } catch (e) { return row.timestamp; }
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.is_simulated ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                                            {row.is_simulated ? 'PAPER' : 'LIVE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{row.symbol}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${row.mode === 'BUY' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                            {row.mode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{row.entry_price}</td>
                                    <td className="px-6 py-4 font-mono">{row.quantity}</td>
                                    <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400">{row.tp}</td>
                                    <td className="px-6 py-4 font-mono text-red-600 dark:text-red-400">{row.sl}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${row.status.startsWith('OPEN') ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : (row.pnl >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600')}`}>{row.status}</span></td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold ${row.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{parseFloat(row.pnl).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {orderBook.length === 0 && <div className="p-12 text-center text-zinc-500">No trades found in order book.</div>}
                </div>
                {totalObPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-200 dark:border-[#27272a]">
                        <span className="text-sm text-zinc-500">
                            Page {obPage} of {totalObPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setObPage(prev => Math.max(prev - 1, 1))}
                                disabled={obPage === 1}
                                className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setObPage(prev => Math.min(prev + 1, totalObPages))}
                                disabled={obPage === totalObPages}
                                className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
