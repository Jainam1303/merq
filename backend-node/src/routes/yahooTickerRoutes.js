const express = require('express');
const router = express.Router();
const axios = require('axios');

// Cache for storing closing prices
let cachedClosingData = null;
let lastFetchDate = null;

// STATIC FALLBACK DATA (Updated Feb 7 2026)
// Used if API fails completely to ensure Marquee always shows relevant data
const FALLBACK_MARKET_DATA = [
    { symbol: "NIFTY 50", price: "24,615.30", change: "+0.45%" },
    { symbol: "BANKNIFTY", price: "52,450.90", change: "+0.68%" },
    { symbol: "SENSEX", price: "80,890.15", change: "+0.38%" },
    { symbol: "INDIA VIX", price: "13.20", change: "-1.50%" },
    { symbol: "RELIANCE", price: "3,065.45", change: "+1.10%" },
    { symbol: "HDFCBANK", price: "1,680.00", change: "+0.90%" },
    { symbol: "TCS", price: "4,010.25", change: "-0.20%" },
    { symbol: "INFY", price: "1,920.55", change: "+0.45%" },
    { symbol: "ICICIBANK", price: "1,145.80", change: "+1.25%" },
    { symbol: "SBIN", price: "855.40", change: "-0.30%" },
    { symbol: "ADANIENT", price: "3,190.00", change: "+2.10%" },
    { symbol: "TATAMOTORS", price: "995.50", change: "+1.50%" },
    { symbol: "ITC", price: "485.60", change: "+0.15%" }
];

// Helper to get today's date IST
function getTodayDateIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
}

router.get('/yahoo-ticker', async (req, res) => {
    try {
        const today = getTodayDateIST();

        // Return cached data if valid for today
        if (cachedClosingData && lastFetchDate === today) {
            console.log('Returning cached closing prices for:', today);
            return res.json(cachedClosingData);
        }

        console.log('Fetching fresh closing prices using Chart API (v8)...');

        const symbols = [
            { id: '^NSEI', name: 'NIFTY 50' },
            { id: '^NSEBANK', name: 'BANKNIFTY' },
            { id: '^BSESN', name: 'SENSEX' },
            { id: 'RELIANCE.NS', name: 'RELIANCE' },
            { id: 'HDFCBANK.NS', name: 'HDFCBANK' },
            { id: 'TCS.NS', name: 'TCS' },
            { id: 'INFY.NS', name: 'INFY' },
            { id: 'ICICIBANK.NS', name: 'ICICIBANK' },
            { id: 'SBIN.NS', name: 'SBIN' },
            { id: 'ADANIENT.NS', name: 'ADANIENT' },
            { id: 'TATAMOTORS.NS', name: 'TATAMOTORS' },
            { id: 'ITC.NS', name: 'ITC' }
        ];

        // Use Chart API which is less restricted than Quote API
        // https://query1.finance.yahoo.com/v8/finance/chart/SYMBOL?interval=1d&range=1d

        const axiosConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://finance.yahoo.com',
                'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 8000
        };

        const promises = symbols.map(async (sym) => {
            try {
                // Try query1 first
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym.id}?interval=1d&range=1d`;
                const response = await axios.get(url, axiosConfig);

                const result = response.data?.chart?.result?.[0];
                if (!result || !result.meta) throw new Error('Invalid data structure');

                const meta = result.meta;
                const close = meta.chartPreviousClose || meta.previousClose || 0;
                const current = meta.regularMarketPrice || 0;

                // Calculate change based on Close vs Previous Close
                const changeVal = current - close;
                const changePct = close ? (changeVal / close) * 100 : 0;

                return {
                    symbol: sym.name,
                    price: current.toFixed(2),
                    change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
                    lastUpdated: today
                };
            } catch (err) {
                console.log(`Failed to fetch ${sym.id}: ${err.message}`);
                // Return fallback for this specific symbol if available
                const fallback = FALLBACK_MARKET_DATA.find(f => f.symbol === sym.name);
                if (fallback) return { ...fallback, lastUpdated: today, isFallback: true };
                return null;
            }
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null);

        if (validResults.length > 0) {
            cachedClosingData = validResults;
            lastFetchDate = today;
            console.log(`✅ Successfully returned ${validResults.length} symbols (Mixed API/Fallback)`);
            return res.json(validResults);
        }

        // Complete failure fallback
        console.log('⚠️ API request failed completely, returning full fallback data');
        res.json(FALLBACK_MARKET_DATA);

    } catch (error) {
        console.error('❌ Yahoo Ticker Route Error:', error.message);
        // Ensure frontend gets something
        res.json(cachedClosingData || FALLBACK_MARKET_DATA);
    }
});

module.exports = router;
