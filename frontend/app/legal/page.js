'use client';
import Link from 'next/link';
import { Shield, FileText, AlertTriangle, Scale } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Legal() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-bold mb-6 text-zinc-900 dark:text-white">Legal Center</h1>
                        <p className="text-lg text-zinc-500 dark:text-zinc-400">Transparancy and compliance are core to our mission.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="/privacy" className="group block p-8 bg-zinc-50 dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] hover:border-blue-500/50 transition-all hover:-translate-y-1">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center mb-6"><Shield /></div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Privacy Policy</h2>
                            <p className="text-zinc-500 text-sm mb-4">How we collect, use, and protect your data.</p>
                            <span className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">Read Policy <span className="text-lg">→</span></span>
                        </Link>

                        <Link href="/terms" className="group block p-8 bg-zinc-50 dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center mb-6"><FileText /></div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Terms of Service</h2>
                            <p className="text-zinc-500 text-sm mb-4">The rules and regulations for using our platform.</p>
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">Read Terms <span className="text-lg">→</span></span>
                        </Link>

                        <Link href="/risk-disclosure" className="group block p-8 bg-zinc-50 dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] hover:border-red-500/50 transition-all hover:-translate-y-1">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl flex items-center justify-center mb-6"><AlertTriangle /></div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Risk Disclosure</h2>
                            <p className="text-zinc-500 text-sm mb-4">Important information regarding the risks of trading.</p>
                            <span className="text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">Read Disclosure <span className="text-lg">→</span></span>
                        </Link>

                        <div className="p-8 bg-zinc-50 dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-[#27272a] opacity-50 cursor-not-allowed">
                            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center mb-6"><Scale /></div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Cookie Policy</h2>
                            <p className="text-zinc-500 text-sm mb-4">Information about how we use cookies. (Coming Soon)</p>
                            <span className="text-zinc-400 text-sm font-bold flex items-center gap-2">Unavailable</span>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
