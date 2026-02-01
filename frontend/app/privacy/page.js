'use client';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-4xl font-bold mb-8 text-zinc-900 dark:text-white">Privacy Policy</h1>

                    <div className="space-y-8 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">1. Information We Collect</h2>
                            <p className="mb-4">We collect information that you provide directly to us, including:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>Account credentials (username, password)</li>
                                <li>Trading API keys and credentials</li>
                                <li>Trading activity and performance data</li>
                                <li>System logs and usage analytics</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">2. How We Use Your Information</h2>
                            <p className="mb-4">We use the information we collect to:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>Provide and maintain our algorithmic trading services</li>
                                <li>Execute trades on your behalf based on your strategy</li>
                                <li>Monitor and improve system performance</li>
                                <li>Communicate with you about your account and services</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">3. Data Security</h2>
                            <p className="mb-4">We implement industry-standard security measures to protect your data:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>Encrypted storage of sensitive credentials</li>
                                <li>Secure API communication using HTTPS</li>
                                <li>Regular security audits and updates</li>
                                <li>Limited access to personal information</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">4. Third-Party Services</h2>
                            <p className="mb-4">We integrate with third-party services including:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>Angel One API for trade execution</li>
                                <li>Market data providers</li>
                                <li>Analytics and monitoring tools</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">5. Your Rights</h2>
                            <p className="mb-4">You have the right to:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>Access your personal data</li>
                                <li>Request data deletion</li>
                                <li>Opt-out of data collection</li>
                                <li>Export your trading history</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">6. Contact Us</h2>
                            <p>For privacy-related questions, contact us at: <a href="mailto:privacy@algoprime.com" className="text-blue-500 hover:underline">privacy@algoprime.com</a></p>
                        </section>

                        <p className="text-sm text-zinc-500 mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-8">Last updated: January 2026</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
