"use client";
import React from 'react';
import { Home, LineChart, ScrollText, Settings, Power, BarChart3, BookOpen, CreditCard, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'status' | 'trades' | 'logs' | 'backtest' | 'analytics';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    isSystemActive: boolean;
    pnl: number;
}

export function MobileNavigation({
    activeTab,
    onTabChange,
    isSystemActive,
    pnl
}: MobileNavigationProps) {
    const tabs: { id: MobileTab; label: string; icon: typeof Home }[] = [
        { id: 'status', label: 'Home', icon: Home },
        { id: 'trades', label: 'Trades', icon: LineChart },
        { id: 'backtest', label: 'Backtest', icon: TrendingUpIcon },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'logs', label: 'Logs', icon: ScrollText },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 safe-area-pb">
            {/* Quick Status Bar - Always visible on mobile */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Live P&L
                    </span>
                </div>
                <div className={cn(
                    "text-sm font-bold tabular-nums",
                    parseFloat(String(pnl ?? 0)) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                    {parseFloat(String(pnl ?? 0)) >= 0 ? '+' : ''}₹{parseFloat(String(pnl ?? 0)).toFixed(2)}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center justify-around py-2 px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center min-h-[48px] min-w-[60px] rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    : "text-zinc-500 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800"
                            )}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                className="mb-0.5"
                            />
                            <span className={cn(
                                "text-[10px] font-medium",
                                isActive && "font-bold"
                            )}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
