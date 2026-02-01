'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Activity, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-200 dark:border-[#27272a] transition-all duration-300">
            <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 cursor-pointer">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                        <Activity size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">MerQ<span className="text-blue-600 dark:text-blue-400">Prime</span></h1>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors py-2">Home</Link>
                    <Link href="/about" className="hover:text-zinc-900 dark:hover:text-white transition-colors py-2">About</Link>
                    <Link href="/blog" className="hover:text-zinc-900 dark:hover:text-white transition-colors py-2">Blog</Link>
                    <Link href="/careers" className="hover:text-zinc-900 dark:hover:text-white transition-colors py-2">Careers</Link>
                    <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-white transition-colors py-2">Contact</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white">Sign In</Link>
                        <Link href="/" className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">Sign Up</Link>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden border-t border-zinc-200 dark:border-[#27272a] bg-white dark:bg-[#09090b]">
                    <div className="px-6 py-4 space-y-3">
                        <Link href="/" className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300">Home</Link>
                        <Link href="/about" className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300">About</Link>
                        <Link href="/blog" className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300">Blog</Link>
                        <Link href="/careers" className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300">Careers</Link>
                        <Link href="/contact" className="block w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300">Contact</Link>
                    </div>
                </div>
            )}
        </header>
    );
}
