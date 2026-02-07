const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;

// Suppress notices from yahoo-finance2
yahooFinance.suppressNotices(['yahooSurvey']);

// Cache for storing closing prices
let cachedClosingData = null;
let lastFetchDate = null;

// Helper function to get today's date string (IST)
function getTodayDateIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Yahoo Finance API endpoint - Returns CLOSING prices (updated once per day)
router.get('/yahoo-ticker', async (req, res) => {
    try {
        const today = getTodayDateIST();

        // Return cached data if available and fetched today
        if (cachedClosingData && lastFetchDate === today) {
            console.log('Returning cached closing prices for:', today);
            return res.json(cachedClosingData);
        }

        console.log('Fetching fresh closing prices from Yahoo Finance...');

        // Indian market symbols for Yahoo Finance
        const symbols = [
            '^NSEI',        // NIFTY 50
            '^NSEBANK',     // BANKNIFTY
            '^BSESN',       // SENSEX
            'RELIANCE.NS',
            'HDFCBANK.NS',
            'TCS.NS',
            'INFY.NS',
            'ICICIBANK.NS',
            'SBIN.NS',
            'ADANIENT.NS',
            'TATAMOTORS.NS',
            'ITC.NS'
        ];

        // Fetch quotes one by one to handle errors better
        const tickerData = [];

        for (const symbol of symbols) {
            try {
                const quote = await yahooFinance.quote(symbol, {
                    fields: ['regularMarketPrice', 'regularMarketPreviousClose', 'regularMarketChangePercent', 'symbol']
                });

                if (quote) {
                    const closePrice = quote.regularMarketPreviousClose || quote.regularMarketPrice || 0;
                    const changePercent = quote.regularMarketChangePercent || 0;

                    // Clean up symbol names for display
                    let displaySymbol = quote.symbol || symbol;
                    if (displaySymbol === '^NSEI') displaySymbol = 'NIFTY 50';
                    else if (displaySymbol === '^NSEBANK') displaySymbol = 'BANKNIFTY';
                    else if (displaySymbol === '^BSESN') displaySymbol = 'SENSEX';
                    else displaySymbol = displaySymbol.replace('.NS', '');

                    tickerData.push({
                        symbol: displaySymbol,
                        price: closePrice.toFixed(2),
                        change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
                        lastUpdated: today
                    });
                }
            } catch (symbolError) {
                console.log(`Failed to fetch ${symbol}:`, symbolError.message);
            }
        }

        // If we got data, cache it
        if (tickerData.length > 0) {
            cachedClosingData = tickerData;
            lastFetchDate = today;
            console.log(`✅ Cached closing prices for ${tickerData.length} symbols`);
            console.log('Sample:', tickerData.slice(0, 2));
            return res.json(tickerData);
        }

        // If API failed, return cached data or empty
        if (cachedClosingData) {
            console.log('API failed, returning cached data');
            return res.json(cachedClosingData);
        }

        res.json([]);

    } catch (error) {
        console.error('❌ Yahoo Finance API Error:', error.message);
        if (cachedClosingData) {
            return res.json(cachedClosingData);
        }
        res.json([]);
    }
});

module.exports = router;
