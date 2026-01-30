"use client";
import React from "react";
import { Activity, ArrowRight, BarChart3, Check, Play, Shield, X, Zap } from "lucide-react";

const MOCK_TICKERS = [
    { symbol: "NIFTY 50", price: "24,350.50", change: "+0.45%" },
    { symbol: "BANKNIFTY", price: "52,100.20", change: "-0.12%" },
    { symbol: "RELIANCE", price: "3,040.00", change: "+1.20%" },
    { symbol: "HDFCBANK", price: "1,650.00", change: "+0.80%" },
    { symbol: "INFY", price: "1,890.90", change: "-0.50%" }
];

const TESTIMONIALS = [
    { name: "Samantha Johnson", role: "CEO, TechFlow", text: "Exceeded our expectations with innovative designs that brought our vision to life - a truly remarkable creative agency.", initials: "SJ", img: "" },
    { name: "Michael Roberts", role: "Fund Manager", text: "The execution speed and reliability be unmatched. We've been running our strategies for 2 years with 99.9% uptime.", initials: "MR", img: "" },
    { name: "Isabella Rodriguez", role: "Founder, Alpha", text: "Their ability to capture our brand essence in every project is unparalleled - an invaluable creative collaborator.", initials: "IR", img: "" },
    { name: "John Peter", role: "Co-founder, Beta", text: "Their team's artistic flair and strategic approach resulted in remarkable campaigns - a reliable creative partner.", initials: "JP", img: "" },
    { name: "Emily Johnson", role: "Retail Investor", text: "Finally, professional-grade trading tools accessible to everyone. The backtesting feature saved me from costly mistakes.", initials: "EJ", img: "" },
    { name: "David Kim", role: "Algo Trader", text: "The API latency is incredibly low. I've switched all my high-frequency strategies to this platform.", initials: "DK", img: "" },
    { name: "Sarah Chen", role: "Pro Trader", text: "MerQPrime transformed my trading. The AI strategy builder helped me create profitable algorithms without writing a single line of code.", initials: "SC", img: "" },
    { name: "Natalie Martinez", role: "Director, Gamma", text: "From concept to execution, their creativity knows no bounds - a game-changer for our brand's success.", initials: "NM", img: "" }
];

const MARKET_TICKER_DATA = [
    { symbol: "NIFTY 50", price: "22,450.30", change: "+0.85%", isGainer: true },
    { symbol: "BANKNIFTY", price: "47,850.15", change: "+1.20%", isGainer: true },
    { symbol: "ADANI PORTS", price: "1,340.50", change: "+4.20%", isGainer: true },
    { symbol: "COAL INDIA", price: "480.25", change: "+3.50%", isGainer: true },
    { symbol: "NTPC", price: "360.80", change: "+2.80%", isGainer: true },
    { symbol: "LTIM", price: "4,950.10", change: "-2.50%", isGainer: false },
    { symbol: "INFY", price: "1,420.40", change: "-1.80%", isGainer: false },
    { symbol: "WIPRO", price: "445.60", change: "-1.50%", isGainer: false }
];

function TickerMarquee() {
    return (
        <div className="w-full border-y border-zinc-200 dark:border-white/5 py-3 overflow-hidden flex relative z-20 backdrop-blur-sm bg-white/50 dark:bg-black/50">
            <div className="flex animate-marquee whitespace-nowrap gap-12 items-center">
                {[...MOCK_TICKERS, ...MOCK_TICKERS, ...MOCK_TICKERS].map((t, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-mono">
                        <span className="font-bold text-zinc-800 dark:text-white">{t.symbol}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{t.price}</span>
                        <span className={`${t.change.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{t.change}</span>
                    </div>
                ))}
            </div>
            <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white dark:from-[#09090b] to-transparent pointer-events-none opacity-50"></div>
            <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white dark:from-[#09090b] to-transparent pointer-events-none opacity-50"></div>
        </div>
    );
}

function MarketTicker({ fetchJson }) {
    const [tickerData, setTickerData] = React.useState(MARKET_TICKER_DATA);

    React.useEffect(() => {
        if (!fetchJson) return;
        fetchJson('/market_data')
            .then(res => {
                if (Array.isArray(res) && res.length > 0) setTickerData(res);
            })
            .catch(() => undefined);
    }, [fetchJson]);

    return (
        <div className="w-full bg-zinc-50 dark:bg-[#09090b] border-y border-zinc-200 dark:border-zinc-800 py-3 overflow-hidden relative">
            <div className="flex animate-marquee whitespace-nowrap gap-12 min-w-full hover:[animation-play-state:paused]">
                {[...tickerData, ...tickerData, ...tickerData, ...tickerData].map((item, i) => (
                    <div key={`${item.symbol}-${i}`} className="flex items-center gap-3 text-sm font-mono shrink-0">
                        <span className="font-bold text-zinc-900 dark:text-white">{item.symbol}</span>
                        <span className="text-zinc-600 dark:text-zinc-400">{item.price}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${item.isGainer ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'}`}>
                            {item.isGainer ? '▲' : '▼'} {item.change}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Landing({ onGetStarted, fetchJson }) {
    return (
        <div className="pt-16">
            <section className="relative pt-20 pb-32 overflow-hidden bg-grid-pattern">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -z-10 opacity-50 dark:opacity-50"></div>
                <div className="absolute top-[20%] left-[20%] w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 opacity-30 dark:opacity-30"></div>
                <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-1000 text-zinc-900 dark:text-white">Trade Smarter with<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400 animate-text-gradient">Algorithmic Intelligence</span></h1>
                    <h2 className="text-3xl md:text-3xl font-black tracking-tight mb-10 animate-in fade-in slide-in-from-bottom-7 duration-1000 delay-100"><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400 animate-text-gradient">Built on Intelligence. Driven by Data.</span></h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <button onClick={onGetStarted} className="h-12 px-8 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] flex items-center gap-2">Get Started <ArrowRight size={16} strokeWidth={3} /></button>
                        <button className="h-12 px-8 rounded-full bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] text-zinc-900 dark:text-white font-bold text-sm hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center gap-2 shadow-sm"><Play size={16} fill="currentColor" /> Watch Demo</button>
                    </div>

                    <div className="relative mt-20 mb-8 mx-auto max-w-[1000px] perspective-[2000px] group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-[#09090b] border border-white/10 shadow-2xl transform rotate-x-12 group-hover:rotate-x-0 transition-transform duration-700 ease-out overflow-hidden aspect-[16/9] flex flex-col">
                            <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                </div>
                                <div className="ml-4 h-4 w-60 bg-white/5 rounded-full"></div>
                            </div>

                            <div className="flex-1 p-6 grid grid-cols-4 gap-4 overflow-hidden">
                                <div className="col-span-1 space-y-4">
                                    <div className="h-32 rounded-lg bg-white/5 animate-pulse delay-75 border border-white/5"></div>
                                    <div className="h-full rounded-lg bg-white/5 border border-white/5"></div>
                                </div>
                                <div className="col-span-3 space-y-4">
                                    <div className="flex gap-4 h-32">
                                        <div className="flex-1 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/20 p-4">
                                            <div className="w-8 h-8 rounded bg-blue-500/20 mb-2"></div>
                                            <div className="h-4 w-20 bg-blue-500/20 rounded mb-1"></div>
                                            <div className="h-8 w-32 bg-blue-500/40 rounded"></div>
                                        </div>
                                        <div className="flex-1 rounded-lg bg-white/5 border border-white/5"></div>
                                        <div className="flex-1 rounded-lg bg-white/5 border border-white/5"></div>
                                    </div>
                                    <div className="h-64 rounded-lg bg-white/5 border border-white/5 relative overflow-hidden">
                                        <svg className="absolute inset-0 w-full h-full text-blue-500/20" preserveAspectRatio="none">
                                            <path d="M0,100 Q100,50 200,80 T400,20" fill="none" stroke="currentColor" strokeWidth="2" />
                                            <path d="M0,100 L0,100 L400,100 Z" fill="currentColor" className="opacity-10" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                        {[
                            { label: "Trading Volume", val: "$2.5B+" },
                            { label: "Active Traders", val: "50K+" },
                            { label: "Uptime", val: "99.9%" },
                            { label: "Execution Speed", val: "< 1ms" }
                        ].map((s, i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl hover:border-blue-400/50 transition-all group shadow-sm dark:shadow-none">
                                <div className="text-2xl font-black text-zinc-900 dark:text-white mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{s.val}</div>
                                <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <MarketTicker fetchJson={fetchJson} />

            <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Workflow</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Start Trading in <span className="text-blue-500 dark:text-blue-400">3 Simple Steps</span></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                step: "01",
                                title: "Connect Broker",
                                desc: "Securely link your Angel One account using API Key & TOTP. Your funds remain in your brokerage account.",
                                icon: <Shield size={32} className="text-blue-600 dark:text-blue-400" />
                            },
                            {
                                step: "02",
                                title: "Select Strategy",
                                desc: "Choose from our pre-built strategies like 'Nifty Trend' or 'Scalper', or configure your own parameters.",
                                icon: <Activity size={32} className="text-blue-600 dark:text-blue-400" />
                            },
                            {
                                step: "03",
                                title: "Automate",
                                desc: "Click 'Start Button' and watch the bot execute trades based on real-time market data. Monitor P&L live.",
                                icon: <Zap size={32} className="text-blue-600 dark:text-blue-400" />
                            }
                        ].map((s, i) => (
                            <div key={i} className="relative group p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all overflow-hidden hover:-translate-y-1 hover:shadow-xl dark:shadow-none">
                                <div className="absolute -right-4 -top-4 text-9xl font-black text-zinc-50 dark:text-zinc-900/40 select-none transition-colors group-hover:text-blue-50 dark:group-hover:text-blue-900/10">
                                    {s.step}
                                </div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        {s.icon}
                                    </div>
                                    <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{s.title}</h4>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Features</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Everything You Need to <span className="text-blue-500 dark:text-blue-400">Trade Like a Pro</span></h3>
                        <p className="text-zinc-600 dark:text-zinc-500 mt-4 max-w-2xl mx-auto">Powerful tools and features designed for both beginners and experienced traders.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <Activity />, title: "AI Strategy Builder", desc: "Create sophisticated strategies with our intuitive AI builder." },
                            { icon: <BarChart3 />, title: "Real-Time Analytics", desc: "Monitor your portfolio with live charts and instant insights." },
                            { icon: <Zap />, title: "Lightning Execution", desc: "Sub-millisecond order execution via direct exchanges." },
                            { icon: <Shield />, title: "Risk Management", desc: "Advanced stop loss and position sizing tools included." }
                        ].map((f, i) => (
                            <div key={i} className="bg-zinc-5 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group hover:border-blue-500/30">
                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#18181b] flex items-center justify-center text-blue-500 dark:text-blue-400 mb-6 group-hover:bg-blue-500/10 group-hover:scale-110 transition-all shadow-sm dark:shadow-none">
                                    {f.icon}
                                </div>
                                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">{f.title}</h4>
                                <p className="text-sm text-zinc-600 dark:text-zinc-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -z-10"></div>

                <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Testimonials</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Trusted by <span className="text-blue-500 dark:text-blue-400">50,000+</span> Traders</h3>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl -mx-6 lg:-mx-8">
                        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-zinc-50 dark:from-[#09090b] to-transparent z-20 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-zinc-50 dark:from-[#09090b] to-transparent z-20 pointer-events-none"></div>

                        <div className="flex gap-6 mb-6 w-max animate-marquee">
                            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                                <div key={i} className="bg-white dark:bg-[#121214] p-8 rounded-3xl border border-zinc-200 dark:border-[#27272a] shadow-sm w-[380px] shrink-0 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer">
                                    <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4 font-serif leading-none">"</div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed min-h-[80px]">{t.text}</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-500/20">
                                            {t.initials}
                                        </div>
                                        <div>
                                            <div className="text-zinc-900 dark:text-white font-bold text-sm">{t.name}</div>
                                            <div className="text-zinc-500 dark:text-zinc-600 text-xs">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-6 w-max animate-marquee-reverse">
                            {[...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3), ...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
                                <div key={i} className="bg-white dark:bg-[#121214] p-8 rounded-3xl border border-zinc-200 dark:border-[#27272a] shadow-sm w-[380px] shrink-0 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer">
                                    <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4 font-serif leading-none">"</div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed min-h-[80px]">{t.text}</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-500/20">
                                            {t.initials}
                                        </div>
                                        <div>
                                            <div className="text-zinc-900 dark:text-white font-bold text-sm">{t.name}</div>
                                            <div className="text-zinc-500 dark:text-zinc-600 text-xs">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Why Switch?</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">The <span className="text-blue-500 dark:text-blue-400">Unfair Advantage</span></h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                                    <X size={24} />
                                </div>
                                <h4 className="text-xl font-bold text-zinc-600 dark:text-zinc-400">Manual Trading</h4>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    "Slow Execution (2-5 seconds)",
                                    "Emotional Decision Making",
                                    "Can't Watch Markets 24/7",
                                    "Missed Opportunities",
                                    "High Stress Levels"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-zinc-500 dark:text-zinc-500">
                                        <X size={16} className="text-red-500 shrink-0" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="relative p-8 rounded-3xl border border-blue-500 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 shadow-2xl shadow-blue-500/10 transform md:-translate-y-4 md:scale-105 z-10 transition-transform duration-300">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">Recommended</div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                                    <Check size={24} strokeWidth={3} />
                                </div>
                                <h4 className="text-xl font-bold text-zinc-900 dark:text-white">MerQPrime Bot</h4>
                            </div>
                            <ul className="space-y-5">
                                {[
                                    "Lightning Fast (< 200ms)",
                                    "100% Logic-Based Execution",
                                    "24/7 Market Monitoring",
                                    "Instant Opportunity Capture",
                                    "Zero Stress Automation"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                            <Check size={12} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={onGetStarted} className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2">
                                Start Automating Now <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center mb-16">
                        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Pricing Plans</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Choose Your <span className="text-blue-500 dark:text-blue-400">Winning Edge</span></h3>
                        <p className="text-zinc-500 mt-4 max-w-2xl mx-auto">Select a plan that fits your trading goals. Upgrade or cancel anytime.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all group flex flex-col">
                            <div className="mb-6">
                                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">1 Month</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-zinc-900 dark:text-white">₹2,000</span>
                                    <span className="text-sm text-zinc-500">/Month</span>
                                </div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {["Basic Strategy Access", "Real-time Data", "5 Backtests/Day", "Community Support"].map((f, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                Choose Plan
                            </button>
                        </div>

                        <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all group flex flex-col">
                            <div className="mb-6">
                                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">3 Months</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-zinc-900 dark:text-white">₹5,500</span>
                                    <span className="text-sm text-zinc-500">/3 Months</span>
                                </div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {["Advanced Strategies", "Priority Data", "20 Backtests/Day", "Email Support", "Save 8%"].map((f, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                Choose Plan
                            </button>
                        </div>

                        <div className="relative p-8 rounded-3xl border border-blue-500 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 shadow-2xl transform md:-translate-y-4 z-10 flex flex-col">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">Most Popular</div>
                            <div className="mb-6">
                                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">6 Months</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-zinc-900 dark:text-white">₹10,000</span>
                                    <span className="text-sm text-zinc-500">/6 Months</span>
                                </div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {["All Strategies", "Ultra-low Latency", "Unlimited Backtests", "Priority Support", "Save 16%"].map((f, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-900 dark:text-white font-medium">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25">
                                Choose Plan
                            </button>
                        </div>

                        <div className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all group flex flex-col">
                            <div className="mb-6">
                                <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">1 Year</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-zinc-900 dark:text-white">₹18,000</span>
                                    <span className="text-sm text-zinc-500">/Year</span>
                                </div>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {["VIP Access", "Dedicated Server", "Unlimited Everything", "24/7 Phone Support", "Save 25%"].map((f, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                            <Check size={12} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                Choose Plan
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-white dark:bg-black border-t border-zinc-200 dark:border-white/5 relative transition-colors duration-300 overflow-hidden">
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 opacity-30"></div>
                <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] -z-10 opacity-30"></div>

                <div className="mx-auto max-w-3xl px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Support</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">Frequently Asked <span className="text-blue-500 dark:text-blue-400">Questions</span></h3>
                        <p className="text-zinc-500 mt-4">Everything you need to know about the product and billing.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { q: "Is my capital safe with MerQPrime?", a: "Absolutley. We operate on a 'non-custodial' basis, meaning we never touch your funds. Your capital remains safely in your Angel One brokerage account. We simply send execution signals via their official, secure API." },
                            { q: "Do I need coding knowledge to use this?", a: "No coding is required. Our 'No-Code Strategy Builder' allows you to select parameters, indicators, and logic using a simple visual interface. We also offer pre-built profitable strategies you can deploy instantly." },
                            { q: "Can I test strategies without risking money?", a: "Yes! We offer two safe environments: 'Backtesting' (simulate strategy on past data) and 'Paper Trading' (live simulation with fake money). We highly recommend using these before going live." },
                            { q: "What happens if my internet disconnects?", a: "Since the strategy runs on your local machine/server, you need to keep the dashboard open. For 24/7 uptime without keeping your laptop on, we recommend deploying this dashboard to a VPS (Virtual Private Server)." },
                            { q: "How fast is trade execution?", a: "Extremely fast. Our average order placement time is under 200 milliseconds, giving you a significant edge over manual trading, especially for scalping strategies." }
                        ].map((item, i) => (
                            <details key={i} className="group glass-card rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden border border-zinc-200 dark:border-white/5 shadow-sm hover:border-blue-500/30 transition-all duration-300">
                                <summary className="flex cursor-pointer items-center justify-between p-6 text-zinc-900 dark:text-white font-bold hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors select-none text-lg">
                                    {item.q}
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors">
                                        <span className="transition-transform duration-300 group-open:rotate-180">
                                            <svg fill="none" height="20" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                                                <path d="M6 9l6 6 6-6"></path>
                                            </svg>
                                        </span>
                                    </div>
                                </summary>
                                <div className="px-6 pb-6 pt-0 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed group-open:animate-fade-in">
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </div >
    );
}
