"use client";
import React from "react";
import { Database, Info, Play } from "lucide-react";

export default function BacktestSection({ ctx, components }) {
    const {
        selectedStrategy,
        setSelectedStrategy,
        allSymbols,
        setAllSymbols,
        btSymbols,
        setBtSymbols,
        btInterval,
        setBtInterval,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        runBacktest,
        isBacktesting,
        backtestResults,
        error,
        setError,
        user,
        addToast,
        fetchJson
    } = ctx;

    const { InstrumentSearch, MultiSelect, CustomDateTimeInput, ErrorBanner } = components;

    const tfOptions = [
        { label: "5 Min", value: "five_minute" },
        { label: "15 Min", value: "fifteen_minute" },
        { label: "30 Min", value: "thirty_minute" },
        { label: "1 Hour", value: "one_hour" }
    ];

    return (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-6 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-[#27272a] shadow-xl">
                <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl p-6 shadow-xl h-fit">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2"><Database size={20} className="text-cyan-500 dark:text-cyan-400" /> Backtest Configuration</h2>
                        <p className="text-zinc-500 text-sm mb-1">Run historical simulations.</p>
                        <p className="text-zinc-400 text-xs flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 w-fit px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">
                            <Info size={12} className="text-cyan-500" /> Backtest will be performed with an initial capital of <strong>₹1,00,000</strong>
                        </p>
                    </div>

                    <div className="mt-6 mb-6">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-2">Strategy to Test</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ id: 'orb', name: 'ORB', desc: 'Opening Range Breakout' }, { id: 'ema', name: 'EMA', desc: '8 & 30 EMA Crossover' }].map(s => (
                                <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                                    className={`p-3 rounded-lg border text-left transition-all ${selectedStrategy === s.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 ring-1 ring-cyan-500' : 'bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-[#27272a] hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                    <div className={`text-xs font-bold mb-0.5 ${selectedStrategy === s.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{s.name}</div>
                                    <div className="text-[10px] text-zinc-500">{s.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-6 w-full">
                    <div className="w-[320px]">
                        <InstrumentSearch onAdd={async (item) => {
                            try {
                                const res = await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(item) });

                                if (res.status === 'success') {
                                    const syms = await fetchJson('/symbols');
                                    setAllSymbols(syms);

                                    // Add to backtest list if not already there
                                    setBtSymbols(prev => {
                                        if (!prev.includes(item.symbol)) {
                                            addToast(`Added ${item.symbol} to backtest list`, "success");
                                            return [...prev, item.symbol];
                                        }
                                        addToast(`${item.symbol} is already in backtest list`, "info");
                                        return prev;
                                    });
                                } else {
                                    addToast(res.message || "Error adding token", "error");
                                }
                            } catch (e) {
                                addToast(e.message || "Error adding token", "error");
                            }
                        }} />
                    </div>
                    <div className="w-[200px] mb-4"><MultiSelect label="Stocks" options={allSymbols} selected={btSymbols} onChange={setBtSymbols} placeholder="Select..." /></div>
                    <div className="w-[100px] mb-4">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Interval</label>
                        <select value={btInterval} onChange={(e) => setBtInterval(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 h-[42px] cursor-pointer">
                            {tfOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="w-[160px] mb-4"><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">From</label><CustomDateTimeInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
                    <div className="w-[160px] mb-4"><label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">To</label><CustomDateTimeInput value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
                    <button onClick={runBacktest} disabled={isBacktesting} className={`flex items-center gap-2 px-8 py-2 mb-4 rounded-xl font-bold transition-all h-[42px] ${isBacktesting ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-lg shadow-cyan-500/20'}`}>Run {isBacktesting ? '...' : <Play size={16} fill="currentColor" />}</button>
                </div>
            </div>
            <ErrorBanner message={error} onClose={() => setError(null)} />
            {backtestResults.length > 0 && (
                <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] flex justify-between items-center">
                        <h3 className="font-bold text-zinc-900 dark:text-white">Results</h3>
                        {user && (
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetchJson('/save_backtest', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                results: backtestResults,
                                                interval: btInterval,
                                                fromDate,
                                                toDate
                                            })
                                        });
                                        if (res.status === 'success') {
                                            addToast(`✓ Saved ${res.saved} results to history!`, "success");
                                        }
                                    } catch (err) {
                                        addToast('Error saving: ' + err.message, "error");
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white dark:text-black rounded-lg font-bold text-sm hover:bg-emerald-400 transition-all"
                            >
                                <Database size={16} /> Save to History
                            </button>
                        )}
                    </div>
                    <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                        <thead className="bg-zinc-100 dark:bg-[#18181b] uppercase font-bold text-xs text-zinc-500 border-b border-zinc-200 dark:border-[#27272a]">
                            <tr>
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Trades</th>
                                <th className="px-6 py-4">Win Rate</th>
                                <th className="px-6 py-4">P&L</th>
                                <th className="px-6 py-4">Final Cap</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                            {backtestResults.map((row, i) => {
                                const pnlVal = parseFloat(String(row['Total P&L']).replace(/[^0-9.-]+/g, ""));
                                return (
                                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                        <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{row.Symbol}</td>
                                        <td className="px-6 py-4">{row['Total Trades']}</td>
                                        <td className="px-6 py-4">{row['Win Rate %']}</td>
                                        <td className={`px-6 py-4 font-mono font-bold ${pnlVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {row['Total P&L']}
                                        </td>
                                        <td className="px-6 py-4 font-mono">{row['Final Capital'] || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
