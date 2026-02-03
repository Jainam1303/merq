"use client";
import React from 'react';
import Link from 'next/link';
import { TrendingUp, Power, LogOut, Moon, Sun, User, MoreVertical, BookOpen, CreditCard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
    isSystemActive: boolean;
    tradingMode: 'PAPER' | 'LIVE';
    user?: any;
    onLogout: () => void;
    onToggleTradingMode?: () => void;
    onNavigateToOrderBook?: () => void;
    onNavigateToPlans?: () => void;
    onNavigateToSettings?: () => void;
}

export function MobileHeader({
    isSystemActive,
    tradingMode,
    user,
    onLogout,
    onToggleTradingMode,
    onNavigateToOrderBook,
    onNavigateToPlans,
    onNavigateToSettings
}: MobileHeaderProps) {
    const [isDarkMode, setIsDarkMode] = React.useState(true);
    const [showMenu, setShowMenu] = React.useState(false);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 safe-area-pt">
            <div className="flex items-center justify-between h-16 px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                        MerQ<span className="text-blue-500">Prime</span>
                    </span>
                </Link>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                    {/* System Status Indicator */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold",
                        isSystemActive
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            isSystemActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                        )} />
                        {isSystemActive ? 'ON' : 'OFF'}
                    </div>

                    {/* PAPER/LIVE Mode Toggle Button */}
                    <button
                        onClick={onToggleTradingMode}
                        disabled={isSystemActive}
                        className={cn(
                            "px-2.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95",
                            isSystemActive && "opacity-50 cursor-not-allowed",
                            tradingMode === 'LIVE'
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        )}
                    >
                        {tradingMode}
                    </button>



                    {/* 3-Dot Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <MoreVertical className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                        </button>

                        {showMenu && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                {/* Menu */}
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 overflow-hidden">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                            {user?.username || 'Trader'}
                                        </p>
                                        <p className="text-xs text-zinc-500 truncate">{user?.email || ''}</p>
                                    </div>

                                    {/* Order Book */}
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onNavigateToOrderBook?.();
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                        <BookOpen size={16} />
                                        Order Book
                                    </button>

                                    {/* Plans */}
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onNavigateToPlans?.();
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                        <CreditCard size={16} />
                                        Plans
                                    </button>

                                    {/* Settings */}
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onNavigateToSettings?.();
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                        <Settings size={16} />
                                        Settings
                                    </button>

                                    {/* Theme Toggle */}
                                    <button
                                        onClick={() => {
                                            toggleTheme();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800"
                                    >
                                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                                        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                                    </button>

                                    {/* Logout Button */}
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onLogout();
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-zinc-100 dark:border-zinc-800"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
