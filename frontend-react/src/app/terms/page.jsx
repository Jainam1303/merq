'use client';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Terms() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-4xl font-bold mb-8 text-zinc-900 dark:text-white">Terms of Service</h1>

                    <div className="space-y-8 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <p className="font-medium">Welcome to MerQPrime. By accessing or using our platform, you agree to be bound by these Terms of Service.</p>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                            <p>By accessing our website and using our algorithmic trading tools, you confirm that you are at least 18 years old and capable of entering into binding contracts.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">2. Trading Risk Disclaimer</h2>
                            <p>Algorithmic trading involves significant risk. MerQPrime provides tools for automation but does not guarantee profits. You are solely responsible for your trading decisions and configuring the bots. We are not financial advisors.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">3. User Accounts</h2>
                            <p>You are responsible for maintaining the security of your account credentials, including API keys. We are not liable for any loss resulting from unauthorized access to your account. You agree to notify us immediately of any unauthorized use.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">4. Limitation of Liability</h2>
                            <p>MerQPrime shall not be held liable for any financial losses, service interruptions, or technical failures associated with the use of our platform. The software is provided "as is" without warranty of any kind.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">5. Subscription & Payments</h2>
                            <p>Paid subscriptions are billed in advance. You may cancel at any time, but refunds are not issued for partial billing periods. We reserve the right to change pricing with notice.</p>
                        </section>

                        <p className="text-sm text-zinc-500 mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-8">Last Updated: January 2026</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
