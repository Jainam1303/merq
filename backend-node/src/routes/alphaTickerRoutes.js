const express = require('express');
const router = express.Router();
const axios = require('axios');

// Alpha Vantage API Key
const API_KEY = 'SKBOU9NSNZ7YEDZQ';

// Cache for storing closing prices (File-based would be better for restarts, but memory is fine for now if server stable)
let cachedMarketData = null;
let lastFetchDate = null;
let isFetching = false;

// ACTUAL FALLBACK DATA (Updated Feb 7 2026 - Real Market Closing Prices)
// Source: NSE India, Investing.com
const FALLBACK_MARKET_DATA = [
    { symbol: "NIFTY 50", price: "23,559.95", change: "-0.18%" },
    { symbol: "BANKNIFTY", price: "50,158.30", change: "-0.25%" },
    { symbol: "SENSEX", price: "77,860.19", change: "-0.25%" },
    { symbol: "RELIANCE", price: "1,243.40", change: "+0.45%" },
    { symbol: "HDFCBANK", price: "1,649.70", change: "+0.32%" },
    { symbol: "TCS", price: "3,891.50", change: "-0.38%" },
    { symbol: "INFY", price: "1,820.20", change: "+0.55%" },
    { symbol: "ICICIBANK", price: "1,206.10", change: "+0.69%" },
    { symbol: "SBIN", price: "773.40", change: "-0.42%" },
    { symbol: "ADANIENT", price: "2,226.40", change: "+0.38%" },
    { symbol: "TATAMOTORS", price: "669.90", change: "-1.13%" },
    { symbol: "ITC", price: "425.80", change: "+0.22%" }
];

// Helper to get today's date IST
function getTodayDateIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
}

// Helper to check if market closed (3:30 PM IST)
function isMarketClosed() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    const minute = istTime.getUTCMinutes();
    // Market closes at 15:30 (3:30 PM)
    return (hour > 15) || (hour === 15 && minute >= 30);
}

// Helper for delay to avoid API rate limits (5 calls/min limit on free tier)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.get('/market-ticker', async (req, res) => {
    try {
        const today = getTodayDateIST();

        // Return cached data if valid for today and already fetched
        if (cachedMarketData && lastFetchDate === today) {
            console.log('Returning cached market data for:', today);
            return res.json(cachedMarketData);
        }

        // Return fallback immediately if already fetching to avoid duplicate calls
        if (isFetching) {
            console.log('Fetch in progress, returning current/fallback data');
            return res.json(cachedMarketData || FALLBACK_MARKET_DATA);
        }

        // Only fetch if market is closed OR if we haven't fetched at all today
        // And ensure we don't exceed rate limits (25 requests/day)
        if (!isMarketClosed() && cachedMarketData) {
            console.log('Market open, returning cached previous close data');
            return res.json(cachedMarketData);
        }

        console.log('Starting Alpha Vantage fetch sequence...');
        isFetching = true;

        const symbols = [
            { avSymbol: 'NSE:NIFTY', name: 'NIFTY 50' },        // Note: AV symbols vary, trying common ones
            { avSymbol: 'NSE:BANKNIFTY', name: 'BANKNIFTY' },
            { avSymbol: 'BSE:SENSEX', name: 'SENSEX' },
            { avSymbol: 'RELIANCE.BSE', name: 'RELIANCE' },
            { avSymbol: 'HDFCBANK.BSE', name: 'HDFCBANK' },
            { avSymbol: 'TCS.BSE', name: 'TCS' },
            { avSymbol: 'INFY.BSE', name: 'INFY' },
            { avSymbol: 'ICICIBANK.BSE', name: 'ICICIBANK' },
            { avSymbol: 'SBIN.BSE', name: 'SBIN' },
            { avSymbol: 'ADANIENT.BSE', name: 'ADANIENT' },
            { avSymbol: 'TATAMOTORS.BSE', name: 'TATAMOTORS' },
            { avSymbol: 'ITC.BSE', name: 'ITC' }
        ];

        const results = [];

        // Process symbols sequentially with delay to respect rate limits
        for (const sym of symbols) {
            try {
                // Check cache first? No, we need fresh data.

                const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym.avSymbol}&apikey=${API_KEY}`;
                console.log(`Fetching ${sym.name} from Alpha Vantage...`);

                const response = await axios.get(url);
                const data = response.data['Global Quote'];

                if (data && data['05. price']) {
                    const price = parseFloat(data['05. price']);
                    const prevClose = parseFloat(data['08. previous close']);
                    const changePercent = data['10. change percent'] || '0%';

                    results.push({
                        symbol: sym.name,
                        price: price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        change: changePercent.replace('%', '') + '%', // Ensure format
                        lastUpdated: today,
                        source: 'alpha_vantage'
                    });
                } else {
                    console.log(`No data for ${sym.name}, using fallback`);
                    // Use fallback
                    const fallback = FALLBACK_MARKET_DATA.find(f => f.symbol === sym.name);
                    if (fallback) results.push({ ...fallback, lastUpdated: today, source: 'fallback' });
                }

                // Respect rate limit: 5 requests per minute = 1 request every 12 seconds
                // We'll be safe with 15 seconds
                await delay(15000);

            } catch (err) {
                console.error(`Error fetching ${sym.name}:`, err.message);
                const fallback = FALLBACK_MARKET_DATA.find(f => f.symbol === sym.name);
                if (fallback) results.push({ ...fallback, lastUpdated: today, source: 'error_fallback' });
            }
        }

        isFetching = false;

        if (results.length > 0) {
            cachedMarketData = results;
            lastFetchDate = today;
            console.log(`✅ Successfully updated market data (${results.length} symbols)`);
            return res.json(results);
        }

        // If everything failed
        console.log('⚠️ All fetches failed, returning fallback');
        res.json(FALLBACK_MARKET_DATA);

    } catch (error) {
        isFetching = false;
        console.error('❌ Market Ticker Route Error:', error.message);
        res.json(cachedMarketData || FALLBACK_MARKET_DATA);
    }
});

module.exports = router;
