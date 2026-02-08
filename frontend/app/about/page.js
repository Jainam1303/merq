'use client';
import { Activity, Zap, Shield, BarChart3, User as UserIcon } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function About() {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#e0e0e0] font-sans transition-colors duration-300">
            <Header />
            <main className="flex-1">
                <div className="pt-16">
                    {/* Hero Section with 3D Effect */}
                    <section className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-blue-50 dark:from-[#09090b] dark:via-[#0a0a0f] dark:to-[#0a0a1a]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-blue-500/5 rounded-full blur-[150px] -z-10 animate-pulse"></div>
                        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -z-10"></div>

                        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                            <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                                <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                                    <span className="text-zinc-900 dark:text-white">About </span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400 animate-text-gradient">MerQPrime</span>
                                </h1>
                                <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-4xl mx-auto leading-relaxed">
                                    A next-generation algorithmic trading platform built at the intersection of professional trading expertise and advanced technology.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Mission Section with Card Effect */}
                    <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300">
                        <div className="mx-auto max-w-7xl px-6 lg:px-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-12 rounded-3xl border border-blue-200 dark:border-blue-800/30">
                                        <div className="w-20 h-20 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300">
                                            <Activity size={40} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">Our Mission</h2>
                                        <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                            To empower traders with intelligent, systematic, and reliable automation tools that bring institutional-grade trading capabilities to modern markets.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">What We Believe</h3>
                                    <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        We believe that successful trading is not driven by emotion or speculation, but by <span className="text-blue-600 dark:text-blue-400 font-semibold">data, discipline, and well-engineered systems</span>.
                                    </p>
                                    <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        MerQPrime is designed to help traders execute strategies with precision, consistency, and confidence—across market conditions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* What We Do Section */}
                    <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
                        <div className="mx-auto max-w-7xl px-6 lg:px-8">
                            <div className="text-center mb-16">
                                <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Our Platform</h2>
                                <h3 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white">What We <span className="text-blue-500 dark:text-blue-400">Do</span></h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                {[
                                    {
                                        icon: <Zap size={28} />,
                                        title: "Systematic Execution",
                                        desc: "Rule-based strategy execution with precision and consistency"
                                    },
                                    {
                                        icon: <Activity size={28} />,
                                        title: "Real-Time Processing",
                                        desc: "Live data processing and automated order management"
                                    },
                                    {
                                        icon: <Shield size={28} />,
                                        title: "Secure Integration",
                                        desc: "Safe broker integrations via encrypted APIs"
                                    },
                                    {
                                        icon: <BarChart3 size={28} />,
                                        title: "Performance Tracking",
                                        desc: "Transparent analytics and risk-aware automation"
                                    }
                                ].map((item, i) => (
                                    <div key={i} className="group relative p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-blue-500/30 transition-all hover:-translate-y-2 hover:shadow-2xl duration-300">
                                        <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                                            {item.icon}
                                        </div>
                                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{item.title}</h4>
                                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-12 rounded-3xl text-center">
                                <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                                    "We help traders move from manual decision-making to structured, repeatable, and scalable trading systems."
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Leadership Section */}
                    <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300 overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] -z-10"></div>

                        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                            <div className="text-center mb-20">
                                <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Leadership</h2>
                                <h3 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6">Meet Our <span className="text-blue-500 dark:text-blue-400">Founders</span></h3>
                                <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
                                    Built by professional traders and experienced software engineers who understand both sides of the trading ecosystem—markets and technology.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                                {/* Jainam Shah */}
                                <div className="group relative">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <div className="relative bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-300">
                                        {/* Image Placeholder */}
                                        <div className="relative mb-8 group-hover:scale-[1.02] transition-transform duration-500">
                                            <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden">
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="text-center">
                                                        <UserIcon size={80} className="text-blue-400 dark:text-blue-500 mx-auto mb-4 opacity-30" />
                                                        <p className="text-sm text-zinc-400 dark:text-zinc-600 font-medium">Image Placeholder</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg whitespace-nowrap">
                                                Co-Founder
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <h4 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Jainam Shah</h4>
                                            <p className="text-blue-600 dark:text-blue-400 font-semibold mb-4">Indian Stock Market Specialist</p>

                                            <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                <p>
                                                    Professional trader specializing in the Indian equity and derivatives markets, with a strong focus on systematic and data-driven trading approaches.
                                                </p>
                                                <p>
                                                    Holds a <span className="font-semibold text-zinc-900 dark:text-white">Bachelor of Computer Applications (BCA)</span> and <span className="font-semibold text-zinc-900 dark:text-white">Master of Computer Applications (MCA)</span> with specialization in Artificial Intelligence.
                                                </p>
                                                <p>
                                                    Brings a unique blend of market understanding and technical intelligence, combining market structure analysis, quantitative logic, and AI-driven models to develop disciplined trading systems.
                                                </p>
                                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                        Leads: Strategy Research, Quantitative Modeling & Analytical Framework Design
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Jainam Bhavsar */}
                                <div className="group relative">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <div className="relative bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 hover:border-indigo-500/30 transition-all duration-300">
                                        {/* Image Placeholder */}
                                        <div className="relative mb-8 group-hover:scale-[1.02] transition-transform duration-500">
                                            <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 border-4 border-white dark:border-zinc-800 shadow-2xl overflow-hidden">
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="text-center">
                                                        <UserIcon size={80} className="text-indigo-400 dark:text-indigo-500 mx-auto mb-4 opacity-30" />
                                                        <p className="text-sm text-zinc-400 dark:text-zinc-600 font-medium">Image Placeholder</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg whitespace-nowrap">
                                                Co-Founder
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <h4 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Jainam Bhavsar</h4>
                                            <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-4">Forex Market Specialist</p>

                                            <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                <p>
                                                    Professional trader specializing in the global Forex markets, with deep expertise in currency market dynamics, volatility behavior, and macro-driven trading systems.
                                                </p>
                                                <p>
                                                    Holds a <span className="font-semibold text-zinc-900 dark:text-white">Bachelor of Technology (B.Tech)</span> degree and has extensive experience working with multi-session global markets and execution-sensitive trading environments.
                                                </p>
                                                <p>
                                                    Plays a key role in the technical architecture and platform development of MerQPrime, leading the design of core system workflows, automation logic, and execution infrastructure.
                                                </p>
                                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                        Leads: Technical Architecture, Platform Development & Execution Infrastructure
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Philosophy Section */}
                    <section className="py-24 bg-zinc-50 dark:bg-[#09090b] relative transition-colors duration-300">
                        <div className="mx-auto max-w-7xl px-6 lg:px-8">
                            <div className="text-center mb-16">
                                <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">Core Values</h2>
                                <h3 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white">Our <span className="text-blue-500 dark:text-blue-400">Philosophy</span></h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        number: "01",
                                        title: "Intelligence Over Emotion",
                                        desc: "Trading decisions should be driven by logic, data, and systems, not impulse.",
                                        gradient: "from-blue-600 to-cyan-600"
                                    },
                                    {
                                        number: "02",
                                        title: "Technology With Purpose",
                                        desc: "Every line of code must serve real trading outcomes.",
                                        gradient: "from-indigo-600 to-purple-600"
                                    },
                                    {
                                        number: "03",
                                        title: "Trust & Transparency",
                                        desc: "User capital remains with their broker; security and data privacy are foundational, not optional.",
                                        gradient: "from-purple-600 to-pink-600"
                                    }
                                ].map((item, i) => (
                                    <div key={i} className="relative group">
                                        <div className={`absolute -inset-1 bg-gradient-to-r ${item.gradient} rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000`}></div>
                                        <div className="relative bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-300 h-full">
                                            <div className={`text-8xl font-black bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent opacity-10 mb-4`}>
                                                {item.number}
                                            </div>
                                            <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">{item.title}</h4>
                                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Vision Section */}
                    <section className="py-24 bg-white dark:bg-black relative transition-colors duration-300 overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10"></div>
                        <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] -z-10"></div>

                        <div className="mx-auto max-w-5xl px-6 lg:px-8 relative z-10">
                            <div className="text-center">
                                <h2 className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2">The Future</h2>
                                <h3 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-8">Our <span className="text-blue-500 dark:text-blue-400">Vision</span></h3>

                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-12 rounded-3xl border border-blue-200 dark:border-blue-800/30">
                                        <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white leading-relaxed mb-6">
                                            To bridge the gap between retail traders and institutional-grade algorithmic trading
                                        </p>
                                        <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl mx-auto">
                                            Whether you are an experienced trader looking to automate strategies or a technology-driven investor seeking systematic execution, MerQPrime provides the infrastructure to trade with <span className="text-blue-600 dark:text-blue-400 font-semibold">clarity, discipline, and control</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
