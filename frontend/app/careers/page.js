'use client';
import Link from 'next/link';
import { Briefcase, Code, Terminal, TrendingUp, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const JOBS = [
    {
        id: 1,
        title: "Senior Backend Engineer",
        department: "Engineering",
        location: "Remote / New York",
        type: "Full-time",
        icon: <Terminal size={24} className="text-purple-500" />,
        description: "We are looking for an experienced Python developer to scale our high-frequency trading engine."
    },
    {
        id: 2,
        title: "Quantitative Researcher",
        department: "Research",
        location: "London, UK",
        type: "Full-time",
        icon: <TrendingUp size={24} className="text-emerald-500" />,
        description: "Join our alpha generation team to build and backtest predictive models using ML/AI."
    },
    {
        id: 3,
        title: "Frontend Developer",
        department: "Product",
        location: "Remote",
        type: "Contract",
        icon: <Code size={24} className="text-blue-500" />,
        description: "Help us build beautiful, responsive dashboards for our traders using Next.js and React."
    }
];

export default function Careers() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="text-purple-500 font-bold tracking-widest text-xs uppercase mb-2 block">Join the Team</span>
                        <h1 className="text-5xl font-bold mb-6 text-zinc-900 dark:text-white">Build the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Trading</span></h1>
                        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">We're on a mission to democratize algorithmic trading. Come solve hard problems with us.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                        {JOBS.map((job) => (
                            <div key={job.id} className="group bg-white dark:bg-[#121214] p-8 rounded-2xl border border-zinc-200 dark:border-[#27272a] hover:border-purple-500/50 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="p-4 bg-zinc-50 dark:bg-[#18181b] rounded-xl border border-zinc-100 dark:border-[#27272a]">
                                    {job.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{job.title}</h3>
                                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2 py-1 rounded">{job.type}</span>
                                    </div>
                                    <p className="text-zinc-500 text-sm mb-3">{job.department} • {job.location}</p>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">{job.description}</p>
                                </div>
                                <button className="whitespace-nowrap px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:opacity-90 transition-opacity">
                                    Apply Now
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 p-12 bg-gradient-to-br from-zinc-900 to-black rounded-3xl text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-6">Don't see a role for you?</h2>
                            <p className="text-zinc-400 max-w-xl mx-auto mb-8">We are always looking for talented individuals. Send us your resume and we'll keep you in mind for future openings.</p>
                            <a href="mailto:careers@algoprime.com" className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-full font-bold hover:bg-purple-500 transition-colors">
                                Email Us <Briefcase size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
