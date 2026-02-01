'use client';
import { Users, Zap, Shield } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function About() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-16">
                        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">About MerQPrime</h1>
                        <p className="text-xl text-zinc-500 max-w-2xl mx-auto">Democratizing institutional-grade algorithmic trading for retail investors.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <div className="p-6 bg-zinc-50 dark:bg-[#121214] rounded-2xl text-center border border-zinc-100 dark:border-zinc-800 hover:border-emerald-500/30 transition-all hover:-translate-y-1 duration-300">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4"><Zap /></div>
                            <h3 className="font-bold mb-2">Speed & Precision</h3>
                            <p className="text-sm text-zinc-500">Execution measured in milliseconds to capture fleeting market opportunities.</p>
                        </div>
                        <div className="p-6 bg-zinc-50 dark:bg-[#121214] rounded-2xl text-center border border-zinc-100 dark:border-zinc-800 hover:border-blue-500/30 transition-all hover:-translate-y-1 duration-300">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4"><Shield /></div>
                            <h3 className="font-bold mb-2">Secure by Design</h3>
                            <p className="text-sm text-zinc-500">Your API keys are encrypted and processed locally where possible. User data privacy is paramount.</p>
                        </div>
                        <div className="p-6 bg-zinc-50 dark:bg-[#121214] rounded-2xl text-center border border-zinc-100 dark:border-zinc-800 hover:border-purple-500/30 transition-all hover:-translate-y-1 duration-300">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4"><Users /></div>
                            <h3 className="font-bold mb-2">Community Driven</h3>
                            <p className="text-sm text-zinc-500">Built by traders, for traders. We constantly evolve based on user feedback.</p>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert mx-auto max-w-none bg-zinc-50 dark:bg-[#121214] p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                        <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed text-center max-w-3xl mx-auto">
                            MerQPrime was founded with a simple goal: to bridge the gap between manual retail trading and high-frequency institutional algorithms.
                            We believe that powerful automation tools should be accessible, intuitive, and safe for everyone. Whether you are a seasoned quant or just starting out, we provide the infrastructure you need to succeed.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
