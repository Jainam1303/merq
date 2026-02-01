'use client';
import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BLOG_POSTS = [
    {
        id: 1,
        title: "Top 5 Algo Trading Strategies for 2025",
        excerpt: "Discover the most effective algorithmic trading strategies that are dominating the market this year. From mean reversion to statistical arbitrage.",
        date: "Jan 05, 2025",
        author: "Sarah Chen",
        category: "Strategies",
        readTime: "5 min read",
        image: "bg-gradient-to-br from-purple-500 to-indigo-600"
    },
    {
        id: 2,
        title: "Risk Management: The Key to Long Term Success",
        excerpt: "Why 90% of traders fail and how proper risk management protocols can save your capital. Learn about position sizing and stop loss automation.",
        date: "Jan 02, 2025",
        author: "Mike Ross",
        category: "Education",
        readTime: "8 min read",
        image: "bg-gradient-to-br from-emerald-500 to-teal-600"
    },
    {
        id: 3,
        title: "How AI is Revolutionizing Stock Markets",
        excerpt: "Artificial Intelligence is no longer just a buzzword. See how deep learning models are predicting market movements with unprecedented accuracy.",
        date: "Dec 28, 2024",
        author: "Dr. Alex Wong",
        category: "Technology",
        readTime: "6 min read",
        image: "bg-gradient-to-br from-blue-500 to-cyan-600"
    }
];

export default function Blog() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="text-blue-500 font-bold tracking-widest text-xs uppercase mb-2 block">Our Blog</span>
                        <h1 className="text-5xl font-bold mb-6 text-zinc-900 dark:text-white">Insights & Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Analysis</span></h1>
                        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Latest updates, trading strategies, and educational content from the MerQPrime team.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {BLOG_POSTS.map((post) => (
                            <div key={post.id} className="group bg-zinc-50 dark:bg-[#121214] rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#27272a] hover:border-blue-500/30 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
                                <div className={`h-48 w-full ${post.image} relative group-hover:scale-105 transition-transform duration-700`}>
                                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider">
                                        {post.category}
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                                        <div className="flex items-center gap-1"><Calendar size={14} /> {post.date}</div>
                                        <div className="flex items-center gap-1"><User size={14} /> {post.author}</div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white leading-tight group-hover:text-blue-500 transition-colors">{post.title}</h3>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <button className="text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                                        Read Article <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
