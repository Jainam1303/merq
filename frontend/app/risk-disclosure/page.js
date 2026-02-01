'use client';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function RiskDisclosure() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col">
            <Header />
            <main className="flex-1 pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8 text-zinc-900 dark:text-white">Risk Disclosure Statement</h1>
                    <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400">
                        <p className="font-bold mb-4">Last updated: January 2025</p>

                        <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl mb-8">
                            <h3 className="text-red-700 dark:text-red-400 font-bold text-lg mb-2">High Risk Warning</h3>
                            <p className="text-sm text-red-600 dark:text-red-400/80 m-0">
                                Trading in financial markets carries a high level of risk and may not be suitable for all investors. You could lose more than your initial investment.
                            </p>
                        </div>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">1. General Risk</h3>
                        <p className="mb-4">
                            MerQPrime ("we", "us", or "our") provides algorithmic trading software. We do not provide financial advice.
                            The information on this website and our software are for educational and informational purposes only.
                        </p>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">2. Algorithmic Trading Risks</h3>
                        <p className="mb-4">
                            Algorithmic trading involves risks including but not limited to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mb-4">
                            <li><strong>System Failure:</strong> Internet connection failures, server crashes, or software bugs may result in missed trades or unintended executions.</li>
                            <li><strong>Market Volatility:</strong> Algorithms may perform poorly in certain market conditions or during black swan events.</li>
                            <li><strong>Over-fitting:</strong> Backtested results do not guarantee future performance. Strategies may be over-fitted to historical data.</li>
                        </ul>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">3. No Guarantee of Profit</h3>
                        <p className="mb-4">
                            There are no guarantees of profit or avoidance of loss when using MerQPrime. You assume full responsibility for all trading actions and outcomes.
                        </p>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">4. Liability</h3>
                        <p className="mb-4">
                            MerQPrime shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our software, including but not limited to loss of profits or data.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
