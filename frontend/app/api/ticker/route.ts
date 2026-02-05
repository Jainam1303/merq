
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
    const symbols = [
        { name: "NIFTY 50", ticker: "^NSEI" },
        { name: "BANKNIFTY", ticker: "^NSEBANK" },
        { name: "RELIANCE", ticker: "RELIANCE.NS" },
        { name: "HDFCBANK", ticker: "HDFCBANK.NS" },
        { name: "TCS", ticker: "TCS.NS" },
        { name: "INFY", ticker: "INFY.NS" },
        { name: "ITC", ticker: "ITC.NS" },
        { name: "SBIN", ticker: "SBIN.NS" },
    ];

    try {
        const results = await Promise.all(
            symbols.map(async (s) => {
                try {
                    // Fetch from Yahoo Finance Query 1 (Unofficial public endpoint usually works for this)
                    const response = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${s.ticker}?interval=1d&range=5d`,
                        { next: { revalidate: 60 } }
                    );

                    if (!response.ok) throw new Error('Failed');

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
                        isPositive: changePct >= 0
                    };
                } catch (e) {
                    console.error(`Error fetching ${s.name}:`, e);
                    // Return fallback/mock if one fails
                    return {
                        symbol: s.name,
                        price: "0.00",
                        change: "0.00%",
                        isPositive: true
                    };
                }
            })
        );

        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }
}
