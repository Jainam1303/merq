
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
    const symbols = [
        // Indices
        { name: "NIFTY 50", ticker: "^NSEI", type: "INDEX" },
        { name: "BANKNIFTY", ticker: "^NSEBANK", type: "INDEX" },

        // Major Stocks
        { name: "RELIANCE", ticker: "RELIANCE.NS" },
        { name: "TCS", ticker: "TCS.NS" },
        { name: "HDFCBANK", ticker: "HDFCBANK.NS" },
        { name: "ICICIBANK", ticker: "ICICIBANK.NS" },
        { name: "INFY", ticker: "INFY.NS" },
        { name: "SBIN", ticker: "SBIN.NS" },
        { name: "BHARTIARTL", ticker: "BHARTIARTL.NS" },
        { name: "ITC", ticker: "ITC.NS" },
        { name: "L&T", ticker: "LT.NS" },
        { name: "AXISBANK", ticker: "AXISBANK.NS" },
        { name: "TATAMOTORS", ticker: "TATAMOTORS.NS" },
        { name: "MARUTI", ticker: "MARUTI.NS" },
        { name: "SUNPHARMA", ticker: "SUNPHARMA.NS" },
        { name: "ASIANPAINT", ticker: "ASIANPAINT.NS" },
        { name: "TITAN", ticker: "TITAN.NS" },
        { name: "BAJFINANCE", ticker: "BAJFINANCE.NS" },
        { name: "NTPC", ticker: "NTPC.NS" },
        { name: "POWERGRID", ticker: "POWERGRID.NS" },
        { name: "ADANIENT", ticker: "ADANIENT.NS" },
        { name: "JSWSTEEL", ticker: "JSWSTEEL.NS" }
    ];

    try {
        const rawResults = await Promise.all(
            symbols.map(async (s) => {
                try {
                    const response = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${s.ticker}?interval=1d&range=5d`,
                        { next: { revalidate: 60 } }
                    );

                    if (!response.ok) return null;

                    const data = await response.json();
                    const meta = data.chart.result[0].meta;
                    const currentPrice = meta.regularMarketPrice;
                    const prevClose = meta.chartPreviousClose;

                    const change = currentPrice - prevClose;
                    const changePct = (change / prevClose) * 100;

                    return {
                        symbol: s.name,
                        price: currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
                        rawChange: changePct,
                        type: s.type || 'STOCK'
                    };
                } catch (e) {
                    return null;
                }
            })
        );

        const validResults = rawResults.filter(r => r !== null);

        // Separate Indices and Stocks
        const indices = validResults.filter(r => r.type === 'INDEX');
        const stocks = validResults.filter(r => r.type === 'STOCK');

        // Sort stocks by performance (High to Low)
        stocks.sort((a, b) => b.rawChange - a.rawChange);

        const topGainers = stocks.slice(0, 5);
        const topLosers = stocks.slice(-5).reverse(); // Reverse so worst is last? No, worst is displayed as Top Loser 1. 
        // Actually slice(-5) gives [worst-4, worst-3, worst-2, worst-1, worst].
        // If we want "Top Losers" usually valid to start with the biggest loser.
        // So let's just use the sorted array from the end.

        // Sort logic review:
        // stocks[0] = Highest positive (Gainer #1)
        // stocks[last] = Lowest negative (Loser #1)

        const losersSorted = [...stocks].sort((a, b) => a.rawChange - b.rawChange).slice(0, 5); // Worst 5

        // Combine for Marquee
        // [Indices] [Gainers] [Losers]
        // Add visual separators or just list them

        const finalData = [...indices, ...topGainers, ...losersSorted];

        return NextResponse.json(finalData);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
