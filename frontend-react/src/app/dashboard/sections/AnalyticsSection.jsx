"use client";
import React from "react";
import { Activity, BarChart3, DollarSign, TrendingUp } from "lucide-react";

export default function AnalyticsSection({ analyticsData }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-[#27272a]">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" /> Performance Analytics
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Complete overview of your trading performance</p>
                </div>

                {/* Metrics Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Trades */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-900/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase mb-2">
                            <Activity size={14} /> Total Trades
                        </div>
                        <div className="text-3xl font-black text-blue-900 dark:text-blue-100">{analyticsData?.total_trades || 0}</div>
                        <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Last 30 days</div>
                    </div>

                    {/* Win Rate */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-2">
                            <TrendingUp size={14} /> Win Rate
                        </div>
                        <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{analyticsData?.win_rate?.toFixed(1) || 0}%</div>
                        <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{analyticsData?.winning_trades || 0}W / {analyticsData?.losing_trades || 0}L</div>
                    </div>

                    {/* Avg Profit/Trade */}
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/10 border border-cyan-200 dark:border-cyan-900/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase mb-2">
                            <DollarSign size={14} /> Avg Profit/Trade
                        </div>
                        <div className="text-3xl font-black text-cyan-900 dark:text-cyan-100">₹{analyticsData?.avg_profit_per_trade?.toFixed(0) || 0}</div>
                        <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">Per executed trade</div>
                    </div>

                    {/* Profit Factor */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200 dark:border-purple-900/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase mb-2">
                            <BarChart3 size={14} /> Profit Factor
                        </div>
                        <div className="text-3xl font-black text-purple-900 dark:text-purple-100">{analyticsData?.profit_factor?.toFixed(2) || 0}</div>
                        <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">{(analyticsData?.profit_factor || 0) > 1.5 ? 'Excellent' : (analyticsData?.profit_factor || 0) > 1 ? 'Good' : 'Needs Work'}</div>
                    </div>
                </div>

                {/* Additional Metrics Row */}
                <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Best Day */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                        <div className="text-xs text-zinc-500 font-bold uppercase mb-2">🏆 Best Day</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {analyticsData?.best_day?.pnl >= 0 ? '+' : ''}₹{analyticsData?.best_day?.pnl?.toFixed(2) || 0}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{analyticsData?.best_day?.date || 'N/A'}</div>
                    </div>

                    {/* Worst Day */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                        <div className="text-xs text-zinc-500 font-bold uppercase mb-2">📉 Worst Day</div>
                        <div className="text-2xl font-black text-red-600 dark:text-red-400">₹{analyticsData?.worst_day?.pnl?.toFixed(2) || 0}</div>
                        <div className="text-xs text-zinc-500 mt-1">{analyticsData?.worst_day?.date || 'N/A'}</div>
                    </div>

                    {/* Max Drawdown */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                        <div className="text-xs text-zinc-500 font-bold uppercase mb-2">⚠️ Max Drawdown</div>
                        <div className="text-2xl font-black text-orange-600 dark:text-orange-400">-{analyticsData?.max_drawdown?.toFixed(1) || 0}%</div>
                        <div className="text-xs text-zinc-500 mt-1">From peak</div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Daily P&L Trend (Last 7 Days)</h3>

                    {/* Simple Bar Chart */}
                    <div className="flex items-end justify-between gap-2 h-48 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                        {(analyticsData?.daily_pnl || []).map((item, i) => {
                            const maxPnl = Math.max(...(analyticsData?.daily_pnl || [{ pnl: 1 }]).map(d => Math.abs(d.pnl)), 1);
                            const height = Math.abs(item.pnl) / maxPnl * 100;
                            const isPositive = item.pnl >= 0;
                            const label = Math.abs(item.pnl) >= 1000
                                ? (item.pnl >= 0 ? `+${(item.pnl / 1000).toFixed(1)}K` : `${(item.pnl / 1000).toFixed(1)}K`)
                                : (item.pnl >= 0 ? `+${item.pnl.toFixed(0)}` : `${item.pnl.toFixed(0)}`);

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="text-[10px] font-bold text-zinc-900 dark:text-white">{label}</div>
                                    <div
                                        className={`w-full rounded-t transition-all hover:opacity-80 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        style={{ height: `${height}%`, minHeight: '10px' }}
                                        title={`₹${item.pnl.toFixed(2)}`}
                                    />
                                    <div className="text-xs text-zinc-500 font-medium">{item.day}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Win/Loss Pie Chart */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Win/Loss Distribution</h3>
                    <div className="flex items-center justify-center gap-12">
                        {/* Simple Pie Chart using conic-gradient */}
                        <div className="relative">
                            <div
                                className="w-48 h-48 rounded-full"
                                style={{
                                    background: `conic-gradient(from 0deg, #10b981 0%, #10b981 ${analyticsData?.win_rate || 0}%, #ef4444 ${analyticsData?.win_rate || 0}%, #ef4444 100%)`
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-32 h-32 bg-white dark:bg-[#121214] rounded-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-zinc-900 dark:text-white">{analyticsData?.win_rate?.toFixed(1) || 0}%</div>
                                        <div className="text-xs text-zinc-500">Win Rate</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded bg-emerald-500" />
                                <div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-white">Winning Trades</div>
                                    <div className="text-xs text-zinc-500">{analyticsData?.winning_trades || 0} trades ({analyticsData?.win_rate?.toFixed(1) || 0}%)</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded bg-red-500" />
                                <div>
                                    <div className="text-sm font-bold text-zinc-900 dark:text-white">Losing Trades</div>
                                    <div className="text-xs text-zinc-500">{analyticsData?.losing_trades || 0} trades ({(100 - (analyticsData?.win_rate || 0)).toFixed(1)}%)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
