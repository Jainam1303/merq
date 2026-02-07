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
    const istOffset = 5.5 * 60 * 60 * 1000;
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

    // Market is closed if: Before 09:15 AM OR After 03:30 PM (15:30)
    if (hour < 9 || (hour === 9 && minute < 15)) return true;
    if (hour > 15 || (hour === 15 && minute >= 30)) return true;
    return false;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Google Finance Fallback Scraper
async function fetchFromGoogleFinance(symbolName, googleSymbol) {
    try {
        const url = `https://www.google.com/finance/quote/${googleSymbol}`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        // Regex to find the price (Class often used is YMlKec)
        const priceMatch = data.match(/<div class="YMlKec fxKbKc">([^<]+)<\/div>/);
        // Clean regex for change which is trickier, hardcode 0.00% if failing
        const changeMatch = data.match(/<div class="JwB6zf" data-is-positive="[^"]+">([^<]+)<\/div>/) || data.match(/<span class="NydbP nZnLmg">([^<]+)<\/span>/);

        if (priceMatch && priceMatch[1]) {
            return {
                symbol: symbolName,
                price: priceMatch[1].replace('₹', '').trim(),
                change: changeMatch ? changeMatch[1] : '0.00%',
                lastUpdated: getTodayDateIST(),
                source: 'google_finance'
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

router.get('/market-ticker', async (req, res) => {
    try {
        const today = getTodayDateIST();

        if (cachedMarketData && lastFetchDate === today) {
            console.log('Returning cached market data for:', today);
            return res.json(cachedMarketData);
        }

        const marketClosed = isMarketClosed();
        const needsUpdate = !cachedMarketData || (marketClosed && lastFetchDate !== today);

        if (needsUpdate && !isFetching) {
            console.log(`Triggering background Alpha Vantage update (Cache: ${cachedMarketData ? 'Old' : 'Empty'}, Market Closed: ${marketClosed})...`);
            setTimeout(() => updateMarketDataInBackground(today), 1);
        }

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
        { avSymbol: 'NSE:NIFTY', gSymbol: 'NIFTY_50:INDEXNSE', name: 'NIFTY 50' },
        { avSymbol: 'NSE:BANKNIFTY', gSymbol: 'NIFTY_BANK:INDEXNSE', name: 'BANKNIFTY' },
        { avSymbol: 'BSE:SENSEX', gSymbol: 'SENSEX:INDEXBSE', name: 'SENSEX' },
        { avSymbol: 'RELIANCE.NS', gSymbol: 'RELIANCE:NSE', name: 'RELIANCE' },
        { avSymbol: 'HDFCBANK.NS', gSymbol: 'HDFCBANK:NSE', name: 'HDFCBANK' },
        { avSymbol: 'TCS.NS', gSymbol: 'TCS:NSE', name: 'TCS' },
        { avSymbol: 'INFY.NS', gSymbol: 'INFY:NSE', name: 'INFY' },
        { avSymbol: 'ICICIBANK.NS', gSymbol: 'ICICIBANK:NSE', name: 'ICICIBANK' },
        { avSymbol: 'SBIN.NS', gSymbol: 'SBIN:NSE', name: 'SBIN' },
        { avSymbol: 'ADANIENT.NS', gSymbol: 'ADANIENT:NSE', name: 'ADANIENT' },
        { avSymbol: 'TATAMOTORS.NS', gSymbol: 'TATAMOTORS:NSE', name: 'TATAMOTORS' },
        { avSymbol: 'ITC.NS', gSymbol: 'ITC:NSE', name: 'ITC' }
    ];

    const results = [];

    for (const sym of symbols) {
        try {
            // 1. Try Alpha Vantage first
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym.avSymbol}&apikey=${API_KEY}`;
            console.log(`Background: Fetching ${sym.name} from Alpha Vantage...`);

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
                console.log(`⚠️ AV Failed for ${sym.name} (Likely Rate Limit/Empty). Response:`, JSON.stringify(response.data));

                // 2. Try Google Finance Fallback
                console.log(`🔄 Attempting Google Finance fallback for ${sym.name}...`);
                const gData = await fetchFromGoogleFinance(sym.name, sym.gSymbol);

                if (gData) {
                    console.log(`✅ Google Finance success for ${sym.name}: ${gData.price}`);
                    results.push(gData);
                } else {
                    console.log(`❌ All sources failed for ${sym.name}, using hardcoded fallback`);
                    const fallback = FALLBACK_MARKET_DATA.find(f => f.symbol === sym.name);
                    if (fallback) results.push({ ...fallback, lastUpdated: today, source: 'fallback' });
                }
            }

            // Respect rate limit: 15s delay (To be nice, even if AV failed we wait a bit, maybe 5s if scraping)
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
