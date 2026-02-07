const express = require('express');
const router = express.Router();

// Yahoo Finance free API endpoint
router.get('/yahoo-ticker', async (req, res) => {
    try {
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

        // Fetch data from Yahoo Finance API
        const yahooFinanceUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';
        const symbolsParam = symbols.join(',');

        const response = await fetch(`${yahooFinanceUrl}?symbols=${symbolsParam}`);
        const data = await response.json();

        if (!data.quoteResponse || !data.quoteResponse.result) {
            return res.json([]);
        }

        // Transform Yahoo Finance data to our format
        const tickerData = data.quoteResponse.result.map(quote => {
            const changePercent = quote.regularMarketChangePercent || 0;
            const price = quote.regularMarketPrice || 0;

            // Clean up symbol names for display
            let displaySymbol = quote.symbol;
            if (displaySymbol === '^NSEI') displaySymbol = 'NIFTY 50';
            else if (displaySymbol === '^NSEBANK') displaySymbol = 'BANKNIFTY';
            else if (displaySymbol === '^BSESN') displaySymbol = 'SENSEX';
            else displaySymbol = displaySymbol.replace('.NS', '');

            return {
                symbol: displaySymbol,
                price: price.toFixed(2),
                change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
            };
        });

        res.json(tickerData);
    } catch (error) {
        console.error('Yahoo Finance API Error:', error);
        // Return empty array on error, frontend will use fallback data
        res.json([]);
    }
});

module.exports = router;
