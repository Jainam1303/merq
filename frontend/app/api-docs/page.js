"use client";
import Link from 'next/link';
import { ArrowLeft, Code, Terminal } from 'lucide-react';

export default function ApiDocs() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-8">
                    <ArrowLeft size={20} /> Back to Home
                </Link>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3"><Code size={36} className="text-emerald-500" /> API Documentation</h1>
                <p className="text-zinc-500 text-lg mb-8">Integrate MerQPrime directly into your own applications.</p>

                <div className="space-y-8">
                    <div className="bg-zinc-100 dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-[#27272a]">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Terminal size={20} /> Authentication</h2>
                        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">All API requests must include your API Key in the header.</p>
                        <div className="bg-zinc-800 text-zinc-300 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                            Authorization: Bearer YOUR_API_KEY
                        </div>
                    </div>

                    <div className="bg-zinc-100 dark:bg-[#121214] p-6 rounded-2xl border border-zinc-200 dark:border-[#27272a]">
                        <h2 className="text-xl font-bold mb-4">Endpoints</h2>

                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">GET</span>
                                    <span className="font-mono text-sm">/api/v1/status</span>
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Check the health and status of your active bots.</p>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">POST</span>
                                    <span className="font-mono text-sm">/api/v1/order</span>
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Place a new algorithmic order.</p>
                                <div className="mt-2 bg-zinc-800 text-zinc-300 p-3 rounded-lg font-mono text-xs">
                                    {`{
  "symbol": "SBIN-EQ",
  "qty": 100,
  "strategy": "MOMENTUM"
}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
