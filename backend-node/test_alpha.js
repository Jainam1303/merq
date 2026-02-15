const axios = require('axios');

const API_KEY = 'SKBOU9NSNZ7YEDZQ';

const symbols = [
    { avSymbol: 'RELIANCE.NS', gSymbol: 'RELIANCE:NSE', name: 'RELIANCE' }
];

async function testAVG() {
    for (const sym of symbols) {
        console.log(`Testing ${sym.name}...`);

        // 1. Alpha Vantage
        try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym.avSymbol}&apikey=${API_KEY}`;
            const res = await axios.get(url);
            console.log('AV Response:', JSON.stringify(res.data));
            if (res.data['Global Quote'] && res.data['Global Quote']['05. price']) {
                console.log('AV Success:', res.data['Global Quote']['05. price']);
            } else {
                console.log('AV Failed/Limit.');
            }
        } catch (e) { console.log('AV Error:', e.message); }

        // 2. Google Finance
        try {
            const gUrl = `https://www.google.com/finance/quote/${sym.gSymbol}`;
            const gRes = await axios.get(gUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            // Check regex
            const match = gRes.data.match(/<div class="YMlKec fxKbKc">([^<]+)<\/div>/);
            if (match) {
                console.log('Google Scrape Success:', match[1]);
            } else {
                console.log('Google Scrape Failed. Regex didn\'t match.');
                // console.log('Partial HTML:', gRes.data.substring(0, 1000));
            }
        } catch (e) { console.log('Google Error:', e.message); }
    }
}

testAVG();
