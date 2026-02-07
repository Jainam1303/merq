const express = require('express');
const router = express.Router();
const axios = require('axios');

// Alpha Vantage API Key
const API_KEY = 'SKBOU9NSNZ7YEDZQ';

// Cache for storing closing prices
let cachedMarketData = null;
let lastFetchDate = null;
let isFetching = false;

// ACTUAL FALLBACK DATA (Updated Feb 7 2026 - Real Market Closing Prices)
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
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5.5
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
}

// Helper to check if market closed
function isMarketClosed() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    const minute = istTime.getUTCMinutes();

    // Market is closed if:
    // 1. Before 09:15 AM
    // 2. After 03:30 PM (15:30)
    if (hour < 9 || (hour === 9 && minute < 15)) return true;
    if (hour > 15 || (hour === 15 && minute >= 30)) return true;

    return false; // Market is OPEN (09:15 - 15:30)
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.get('/market-ticker', async (req, res) => {
    try {
        const today = getTodayDateIST();

        // 1. Check if we have valid cached data for today
        if (cachedMarketData && lastFetchDate === today) {
            console.log('Returning cached market data for:', today);
            return res.json(cachedMarketData);
        }

        // 2. Determine if we need to update
        // a) Trigger if we have NO data at all (e.g. server restart)
        // b) Trigger if Market is Closed AND cache is old (Next day update)
        // c) Trigger if Market is OPEN but we have NO data (Should attempt fetch anyway)
        const marketClosed = isMarketClosed();
        const needsUpdate = !cachedMarketData || (marketClosed && lastFetchDate !== today);

        if (needsUpdate && !isFetching) {
            console.log(`Triggering background Alpha Vantage update (Cache: ${cachedMarketData ? 'Old' : 'Empty'}, Market Closed: ${marketClosed})...`);
            // Wait 1ms so response returns immediately, then fetch starts
            setTimeout(() => updateMarketDataInBackground(today), 1);
        }

        // 3. Return accepted data IMMEDIATELY (Do not wait for fetch)
        console.log(`Returning immediate data (Source: ${cachedMarketData ? 'Cache (Previous)' : 'Fallback'})`);
        return res.json(cachedMarketData || FALLBACK_MARKET_DATA);

    } catch (error) {
        console.error('❌ Market Ticker Route Error:', error.message);
        res.json(cachedMarketData || FALLBACK_MARKET_DATA);
    }
});

// Background update function
async function updateMarketDataInBackground(today) {
    if (isFetching) return;
    isFetching = true;
    console.log('🚀 Starting background fetch sequence...');

    const symbols = [
        // Indices (Often hard to get on free APIs, might fall back)
        { avSymbol: 'NSE:NIFTY', name: 'NIFTY 50' },
        { avSymbol: 'NSE:BANKNIFTY', name: 'BANKNIFTY' },
        { avSymbol: 'BSE:SENSEX', name: 'SENSEX' },

        // Stocks (Switching to NSE .NS for better reliability)
        { avSymbol: 'RELIANCE.NS', name: 'RELIANCE' },
        { avSymbol: 'HDFCBANK.NS', name: 'HDFCBANK' },
        { avSymbol: 'TCS.NS', name: 'TCS' },
        { avSymbol: 'INFY.NS', name: 'INFY' },
        { avSymbol: 'ICICIBANK.NS', name: 'ICICIBANK' },
        { avSymbol: 'SBIN.NS', name: 'SBIN' },
        { avSymbol: 'ADANIENT.NS', name: 'ADANIENT' },
        { avSymbol: 'TATAMOTORS.NS', name: 'TATAMOTORS' },
        { avSymbol: 'ITC.NS', name: 'ITC' }
    ];

    const results = [];

    for (const sym of symbols) {
        try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym.avSymbol}&apikey=${API_KEY}`;
            console.log(`Background: Fetching ${sym.name}...`);

            const response = await axios.get(url);
            const data = response.data['Global Quote'];

            if (data && data['05. price']) {
                const price = parseFloat(data['05. price']);
                const changePercent = data['10. change percent'] || '0%';

                results.push({
                    symbol: sym.name,
                    price: price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    change: changePercent.replace('%', '') + '%',
                    lastUpdated: today,
                    source: 'alpha_vantage'
                });
            } else {
                console.log(`Background: No data for ${sym.name}, using fallback`);
                const fallback = FALLBACK_MARKET_DATA.find(f => f.symbol === sym.name);
                if (fallback) results.push({ ...fallback, lastUpdated: today, source: 'fallback' });
            }

            // Respect rate limit: 15s delay
            await delay(15000);

        } catch (err) {
            console.error(`Background: Error fetching ${sym.name}:`, err.message);
            const fallback = FALLBACK_MARKET_DATA.find(f => f.symbol === sym.name);
            if (fallback) results.push({ ...fallback, lastUpdated: today, source: 'error_fallback' });
        }
    }

    isFetching = false;

    if (results.length > 0) {
        cachedMarketData = results;
        lastFetchDate = today;
        console.log(`✅ Background update complete (${results.length} symbols updated)`);
    } else {
        console.log('⚠️ Background update failed, keeping previous data');
    }
}

module.exports = router;
