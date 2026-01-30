"use client";
import React from "react";
import { Activity, AlertTriangle, DollarSign, Download, Eye, EyeOff, ShieldAlert, Trash2, Upload, Zap } from "lucide-react";

export default function LiveTradingSection({ ctx, components }) {
    const {
        status,
        startBot,
        stopBot,
        liveSymbols,
        setLiveSymbols,
        allSymbols,
        setAllSymbols,
        liveInterval,
        setLiveInterval,
        tfOptions,
        selectedStrategy,
        setSelectedStrategy,
        startTime,
        setStartTime,
        stopTime,
        setStopTime,
        initialCapital,
        setInitialCapital,
        isSafetyOn,
        setIsSafetyOn,
        setSafetyTriggered,
        maxLoss,
        setMaxLoss,
        isSimulated,
        addToast,
        fetchJson,
        handleBulkUpload,
        handleGlobalSquareOff,
        activeTrades,
        showConfirm,
        showPrompt,
        setActiveTrades,
        pnl,
        showLogs,
        setShowLogs,
        clearTime,
        setClearTime,
        logs
    } = ctx;

    const { InstrumentSearch, MultiSelect, TradeRow } = components;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-1 flex flex-col gap-6">
                {/* System Status / Toggle Box */}
                <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-5 rounded-2xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <Zap size={14} className={status === "RUNNING" ? "text-blue-500" : ""} />
                        System Status
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold transition-colors ${status === "RUNNING" ? "text-zinc-400" : "text-zinc-600 dark:text-zinc-300"}`}>OFF</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={status === "RUNNING"}
                                onChange={() => status === "RUNNING" ? stopBot() : startBot()}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                        </label>
                        <span className={`text-xs font-bold transition-colors ${status === "RUNNING" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`}>ON</span>
                    </div>
                </div>

                <div className={`bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-5 rounded-2xl shadow-xl space-y-4 transition-opacity ${status === "RUNNING" ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2"><Activity size={14} /> Strategy Config</div>
                    <div className="space-y-4">
                        <InstrumentSearch onAdd={async (item) => {
                            try {
                                const res = await fetchJson('/add_token', { method: 'POST', body: JSON.stringify(item) });

                                if (res.status === 'success') {
                                    const syms = await fetchJson('/symbols');
                                    setAllSymbols(syms);

                                    // Add to watchlist if not already there
                                    setLiveSymbols(prev => {
                                        if (!prev.includes(item.symbol)) {
                                            addToast(`Added ${item.symbol} to watchlist`, "success");
                                            return [...prev, item.symbol];
                                        }
                                        addToast(`${item.symbol} is already in your watchlist`, "info");
                                        return prev;
                                    });
                                } else {
                                    addToast(res.message || "Error adding token", "error");
                                }
                            } catch (e) {
                                addToast(e.message || "Error adding token", "error");
                            }
                        }} />
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] uppercase text-zinc-500 font-bold">Stock Universe</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            const csvContent = "data:text/csv;charset=utf-8," + "SYMBOL\nSBIN-EQ\nRELIANCE-EQ\nINFY-EQ\nTATASTEEL-EQ";
                                            const encodedUri = encodeURI(csvContent);
                                            const link = document.createElement("a");
                                            link.setAttribute("href", encodedUri);
                                            link.setAttribute("download", "sample_symbols.csv");
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }} className="flex items-center gap-1 cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded transition-colors" title="Download Sample CSV">
                                            <Download size={10} /> Sample
                                        </button>
                                        <label className="flex items-center gap-1 cursor-pointer text-[10px] text-blue-500 hover:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                            <Upload size={10} /> Bulk Upload
                                            <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                                        </label>
                                        <button onClick={() => setLiveSymbols([])} className="flex items-center justify-center cursor-pointer text-red-500 hover:text-red-400 bg-red-50 dark:bg-red-900/20 w-6 h-6 rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900/40" title="Clear All Symbols">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <MultiSelect options={allSymbols} selected={liveSymbols} onChange={setLiveSymbols} placeholder="Select Stocks..." />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Timeframe</label>
                            <div className="grid grid-cols-4 gap-1">
                                {tfOptions.map(tf => (
                                    <button key={tf.value} onClick={() => setLiveInterval(tf.value)} className={`px-1 py-2 text-[10px] font-bold rounded border transition-all ${liveInterval === tf.value ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-[#27272a] text-zinc-500 hover:border-zinc-400'}`}>
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Strategy Selection */}
                        <div className="mb-4">
                            <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-2">Select Strategy</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ id: 'orb', name: 'ORB', desc: 'Opening Range Breakout' }, { id: 'ema', name: 'EMA', desc: '8 & 30 EMA Crossover' }].map(s => (
                                    <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                                        className={`p-3 rounded-lg border text-left transition-all ${selectedStrategy === s.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-zinc-50 dark:bg-[#18181b] border-zinc-200 dark:border-[#27272a] hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                        <div className={`text-xs font-bold mb-0.5 ${selectedStrategy === s.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{s.name}</div>
                                        <div className="text-[10px] text-zinc-500">{s.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Start</label>
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-2 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Stop</label>
                                <input type="time" value={stopTime} onChange={(e) => setStopTime(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded px-2 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Initial Capital</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                                <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded pl-6 pr-2 py-2 text-xs text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                            </div>
                        </div>

                        {/* Safety Guard Config */}
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1"><ShieldAlert size={12} className={isSafetyOn ? "text-red-500" : ""} /> Safety Guard (Auto-Stop)</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isSafetyOn} onChange={() => { setIsSafetyOn(!isSafetyOn); setSafetyTriggered(false); }} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-red-500"></div>
                                </label>
                            </div>
                            <div className={`transition-all duration-300 ${isSafetyOn ? 'opacity-100 max-h-20' : 'opacity-40 max-h-0 overflow-hidden'}`}>
                                <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Max Daily Loss Limit</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">-₹</span>
                                    <input
                                        type="number"
                                        value={maxLoss}
                                        onChange={(e) => setMaxLoss(e.target.value)}
                                        className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded pl-7 pr-2 py-2 text-xs text-red-600 dark:text-red-400 focus:border-red-500 focus:outline-none transition-colors font-bold"
                                        placeholder="1000"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-5 rounded-2xl shadow-xl relative overflow-hidden flex items-center justify-between">
                    <div className="absolute inset-0 opacity-10 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase"><DollarSign size={14} /> Live P&L</div>
                    <span className={`relative z-10 font-mono text-2xl font-black ${pnl >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'} transition-all`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
                </div>
            </div>
            <div className="lg:col-span-3">
                <div className="h-full flex flex-col gap-8">
                    {/* Active Trades */}
                    <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl overflow-hidden shadow-xl flex-shrink-0 min-h-[200px] flex flex-col">
                        <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] flex items-center justify-between">
                            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Activity size={16} className="text-emerald-500" /> Active Positions</h3>
                            {activeTrades.length > 0 && (
                                <button onClick={handleGlobalSquareOff} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1">
                                    <AlertTriangle size={12} /> SQUARE OFF ALL
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs table-fixed">
                                <thead className="bg-zinc-50 dark:bg-[#18181b] text-zinc-500 font-bold uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 w-[80px]">Time</th>
                                        <th className="px-4 py-3 w-[140px]">Symbol</th>
                                        <th className="px-4 py-3 w-[70px]">Type</th>
                                        <th className="px-4 py-3 w-[60px]">Qty</th>
                                        <th className="px-4 py-3 w-[90px]">Entry</th>
                                        <th className="px-4 py-3 w-[90px]">TP</th>
                                        <th className="px-4 py-3 w-[90px]">SL</th>
                                        <th className="px-4 py-3 w-[90px]">PnL</th>
                                        <th className="px-4 py-3 w-[120px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                                    {activeTrades.length === 0 ? <tr><td colSpan="9" className="px-4 py-8 text-center text-zinc-500 italic">No active trades running.</td></tr> : activeTrades.map((t) => (
                                        <TradeRow
                                            key={t.entry_order_id}
                                            t={t}
                                            onUpdateTP={async (trade, newTP) => {
                                                try {
                                                    const res = await fetchJson('/update_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id, sl: trade.sl, tp: newTP }) });
                                                    if (res.status === 'success') {
                                                        addToast(res.message, "success");
                                                        setActiveTrades(prev => prev.map(pt => pt.entry_order_id === trade.entry_order_id ? { ...pt, tp: parseFloat(newTP) } : pt));
                                                    } else {
                                                        addToast(res.message || "Update Failed", "error");
                                                    }
                                                } catch (e) {
                                                    addToast("Update Failed: " + e.message, "error");
                                                }
                                            }}
                                            onUpdateSL={async (trade, newSL) => {
                                                try {
                                                    const res = await fetchJson('/update_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id, sl: newSL, tp: trade.tp }) });
                                                    if (res.status === 'success') {
                                                        addToast(res.message, "success");
                                                        setActiveTrades(prev => prev.map(pt => pt.entry_order_id === trade.entry_order_id ? { ...pt, sl: parseFloat(newSL) } : pt));
                                                    } else {
                                                        addToast(res.message || "Update Failed", "error");
                                                    }
                                                } catch (e) {
                                                    addToast("Update Failed: " + e.message, "error");
                                                }
                                            }}
                                            onExit={async (trade) => {
                                                const confirmed = await showConfirm("Force Exit Trade", "This will attempt to square off at market price. Are you sure?", null, "danger");
                                                if (confirmed) {
                                                    try { const res = await fetchJson('/exit_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id }) }); addToast(res.message, "success"); } catch (e) { addToast("Error: " + e.message, "error"); }
                                                }
                                            }}
                                            onDelete={async (trade) => {
                                                const confirmed = await showConfirm("Delete Trade Record", "This does NOT exit the position on exchange. Only removes from tracking. Continue?", null, "warning");
                                                if (confirmed) {
                                                    try { const res = await fetchJson('/delete_active_trade', { method: 'POST', body: JSON.stringify({ trade_id: trade.entry_order_id }) }); addToast(res.message, "success"); } catch (e) { addToast("Error: " + e.message, "error"); }
                                                }
                                            }}
                                            showPrompt={showPrompt}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {showLogs && (
                        <div className="h-[320px] max-h-[320px] bg-zinc-900 dark:bg-black border border-zinc-200 dark:border-[#27272a] rounded-2xl p-4 font-mono text-xs flex flex-col shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full bg-zinc-800 dark:bg-[#121214] border-b border-zinc-700 dark:border-[#27272a] px-4 py-3 flex items-center justify-between z-10">
                                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500"><span className="font-bold uppercase tracking-wider text-[10px]">System Output</span></div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setShowLogs(false)} title="Hide Logs" className="text-zinc-500 hover:text-blue-500 transition-colors">
                                        <EyeOff size={14} />
                                    </button>
                                    <button onClick={() => { setClearTime(new Date()); setLogs([]); }} title="Clear Logs" className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                    <div className="flex gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div></div>
                                </div>
                            </div>
                            <div className="mt-10 h-[calc(320px-50px)] max-h-[calc(320px-50px)] overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                {logs.slice(-100).map((log, i) => (
                                    <div key={i} className="flex gap-4 hover:bg-zinc-800/50 dark:hover:bg-zinc-900/50 p-0.5 rounded">
                                        <span className="text-zinc-500 dark:text-zinc-600 shrink-0 select-none">{log.split(' - ')[0]}</span>
                                        <span className={`break-all ${log.includes("Error") ? 'text-red-400 font-bold' : (log.includes("SIGNAL") ? 'text-yellow-400 font-bold glow' : 'text-zinc-400 dark:text-zinc-300')}`}>{log.split(' - ').slice(1).join(' - ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!showLogs && (
                        <div className="bg-zinc-900/50 dark:bg-black/50 border border-zinc-200 dark:border-[#27272a] rounded-2xl p-4 flex items-center justify-center">
                            <button
                                onClick={() => setShowLogs(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                            >
                                <Eye size={16} />
                                <span className="font-medium text-sm">Show System Logs</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
