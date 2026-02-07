const express = require('express');
const router = express.Router();
const axios = require('axios');

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

        console.log('Fetching fresh closing prices from Yahoo Finance via Axios...');

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

        // Configure axios with browser-like headers to avoid blocking
        const axiosConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 5000 // 5 seconds timeout
        };

        const symbolsParam = symbols.join(',');
        // Try query1 first, fallback to query2
        const endpoints = [
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`,
            `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`
        ];

        let data = null;

        for (const endpoint of endpoints) {
            try {
                console.log(`Trying endpoint: ${endpoint}`);
                const response = await axios.get(endpoint, axiosConfig);
                if (response.data && response.data.quoteResponse && response.data.quoteResponse.result) {
                    data = response.data;
                    break; // Success
                }
            } catch (endpointError) {
                console.log(`Failed to fetch from ${endpoint}: ${endpointError.message}`);
                // Log full error if available
                if (endpointError.response) {
                    console.log('Error status:', endpointError.response.status);
                    console.log('Error data:', JSON.stringify(endpointError.response.data).substring(0, 100)); // Log first 100 chars
                }
            }
        }

        if (!data || !data.quoteResponse || !data.quoteResponse.result || data.quoteResponse.result.length === 0) {
            console.log('Both endpoints failed or returned empty data');
            // Return cached data if API fails
            if (cachedClosingData) {
                console.log('Returning cached data as fallback');
                return res.json(cachedClosingData);
            }
            return res.json([]);
        }

        console.log(`Successfully fetched data for ${data.quoteResponse.result.length} symbols`);

        // Transform Yahoo Finance data to our format using CLOSING prices
        const tickerData = data.quoteResponse.result.map(quote => {
            // Use regularMarketPreviousClose for the closing price of last trading day
            const closePrice = quote.regularMarketPreviousClose || quote.previousClose || quote.regularMarketPrice || 0;

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
        res.json(tickerData);

    } catch (error) {
        console.error('❌ General Error in Ticker Route:', error.message);
        if (cachedClosingData) {
            return res.json(cachedClosingData);
        }
        res.json([]);
    }
});

module.exports = router;
