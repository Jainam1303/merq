'use client';
import Link from 'next/link';
import { Activity, Twitter, Github } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="border-t border-zinc-200 dark:border-white/5 bg-white dark:bg-black py-16 transition-colors duration-300 mt-auto">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="bg-blue-500/20 p-1.5 rounded-lg">
                            <Activity size={20} className="text-blue-600 dark:text-blue-500" strokeWidth={3} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">MerQ<span className="text-blue-500 dark:text-blue-400">Prime</span></h1>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed mb-6">Empowering traders with intelligent algorithms and real-time market insights.</p>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"><Twitter size={14} /></div>
                        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"><Github size={14} /></div>
                    </div>
                </div>
                {[
                    { head: "Product", links: [{ l: "Features", h: "/" }, { l: "Pricing", h: "/" }, { l: "Dashboard", h: "/" }, { l: "API Docs", h: "/api-docs" }] },
                    { head: "Company", links: [{ l: "About", h: "/about" }, { l: "Blog", h: "/blog" }, { l: "Careers", h: "/careers" }, { l: "Contact", h: "/contact" }] },
                    { head: "Legal", links: [{ l: "Privacy Policy", h: "/privacy" }, { l: "Terms of Service", h: "/terms" }, { l: "Risk Disclosure", h: "/risk-disclosure" }] },
                ].map((col, i) => (
                    <div key={i}>
                        <h4 className="text-zinc-900 dark:text-white font-bold mb-6">{col.head}</h4>
                        <ul className="space-y-4 text-sm text-zinc-500">
                            {col.links.map(item => <li key={item.l}><Link href={item.h} className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">{item.l}</Link></li>)}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-zinc-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
                <p>© 2025 MerQPrime. All rights reserved.</p>
                <p>Trading involves risk.</p>
            </div>
        </footer>
    );
}
