const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;

// Cache for storing closing prices
let cachedClosingData = null;
let lastFetchDate = null;

// Helper function to check if market has closed today (3:30 PM IST)
function hasMarketClosedToday() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);

    const currentHour = istTime.getUTCHours();
    const currentMinute = istTime.getUTCMinutes();
    const currentDay = istTime.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Market closes at 3:30 PM (15:30) IST on weekdays
    // Skip weekends
    if (currentDay === 0 || currentDay === 6) {
        return false;
    }

    // Check if it's after 3:30 PM IST
    return (currentHour > 15) || (currentHour === 15 && currentMinute >= 30);
}

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

        // Return cached data if:
        // 1. We have cached data
        // 2. It was fetched today
        // 3. Market has already closed today
        if (cachedClosingData && lastFetchDate === today && hasMarketClosedToday()) {
            console.log('Returning cached closing prices for:', today);
            return res.json(cachedClosingData);
        }

        // If market hasn't closed yet, return cached data from previous day
        if (!hasMarketClosedToday() && cachedClosingData) {
            console.log('Market not closed yet, returning previous closing prices');
            return res.json(cachedClosingData);
        }

        console.log('Fetching fresh closing prices from Yahoo Finance...');

        // Indian market symbols for Yahoo Finance
        const symbols = [
            '^NSEI',      // NIFTY 50
            '^NSEBANK',   // BANKNIFTY
            '^BSESN',     // SENSEX
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

        // Fetch quotes using yahoo-finance2
        const quotes = await yahooFinance.quote(symbols);

        if (!quotes || (Array.isArray(quotes) && quotes.length === 0)) {
            // Return cached data if API fails
            if (cachedClosingData) {
                console.log('API returned empty, using cached data');
                return res.json(cachedClosingData);
            }
            return res.json([]);
        }

        // Handle both single quote and array of quotes
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

        // Transform Yahoo Finance data to our format using CLOSING prices
        const tickerData = quotesArray.map(quote => {
            // Use regularMarketPreviousClose for the closing price of last trading day
            const closePrice = quote.regularMarketPreviousClose || quote.previousClose || 0;

            // Get the change percentage
            let changePercent = 0;
            if (quote.regularMarketChangePercent !== undefined) {
                changePercent = quote.regularMarketChangePercent;
            } else if (quote.regularMarketPrice && quote.regularMarketPreviousClose) {
                const changeValue = quote.regularMarketPrice - quote.regularMarketPreviousClose;
                changePercent = (changeValue / quote.regularMarketPreviousClose) * 100;
            }

            // Clean up symbol names for display
            let displaySymbol = quote.symbol;
            if (displaySymbol === '^NSEI') displaySymbol = 'NIFTY 50';
            else if (displaySymbol === '^NSEBANK') displaySymbol = 'BANKNIFTY';
            else if (displaySymbol === '^BSESN') displaySymbol = 'SENSEX';
            else displaySymbol = displaySymbol.replace('.NS', '');

            return {
                symbol: displaySymbol,
                price: closePrice.toFixed(2),
                change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
                lastUpdated: today
            };
        });

        // Cache the closing data
        cachedClosingData = tickerData;
        lastFetchDate = today;

        console.log(`✅ Cached closing prices for ${tickerData.length} symbols`);
        console.log('Sample data:', tickerData.slice(0, 2)); // Log first 2 for verification

        res.json(tickerData);

    } catch (error) {
        console.error('❌ Yahoo Finance API Error:', error.message);
        // Return cached data if available, otherwise empty array
        if (cachedClosingData) {
            console.log('Error occurred, returning cached data');
            return res.json(cachedClosingData);
        }
        res.json([]);
    }
});

module.exports = router;
