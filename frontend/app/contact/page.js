'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Contact() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-emerald-500 font-bold tracking-widest text-xs uppercase mb-2 block">Contact Us</span>
                            <h1 className="text-5xl font-bold mb-6 text-zinc-900 dark:text-white">Get in Touch</h1>
                            <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-8 leading-relaxed">
                                Have questions about setting up your bot? Need enterprise API limits?
                                We're here to help you deploy your winning strategies.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 group cursor-pointer">
                                    <div className="p-4 bg-zinc-100 dark:bg-[#121214] rounded-2xl group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors"><Mail size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-lg">Email</h3>
                                        <p className="text-sm text-zinc-500 hover:text-emerald-500 transition-colors">support@algoprime.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group cursor-pointer">
                                    <div className="p-4 bg-zinc-100 dark:bg-[#121214] rounded-2xl group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors"><Phone size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-lg">Phone</h3>
                                        <p className="text-sm text-zinc-500 hover:text-blue-500 transition-colors">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group cursor-pointer">
                                    <div className="p-4 bg-zinc-100 dark:bg-[#121214] rounded-2xl group-hover:bg-purple-500/10 group-hover:text-purple-500 transition-colors"><MapPin size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-lg">Office</h3>
                                        <p className="text-sm text-zinc-500 hover:text-purple-500 transition-colors">123 Trading Blvd, FinTech City</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#121214] p-8 md:p-10 rounded-3xl border border-zinc-200 dark:border-[#27272a] shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
                            {submitted ? (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6">
                                        <Send size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">Message Sent!</h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                                    <button onClick={() => setSubmitted(false)} className="mt-8 text-emerald-500 font-bold hover:underline">Send another message</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <h3 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Send us a message</h3>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Name</label>
                                        <input type="text" required className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-xl px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-zinc-900 dark:text-white" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Email</label>
                                        <input type="email" required className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-xl px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-zinc-900 dark:text-white" placeholder="john@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Message</label>
                                        <textarea required rows={4} className="w-full bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-xl px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-zinc-900 dark:text-white resize-none" placeholder="How can we help?" />
                                    </div>
                                    <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5">
                                        Send Message
                                    </button>
                                </form>
                            )}
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
