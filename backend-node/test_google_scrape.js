const axios = require('axios');

async function debug() {
    try {
        const { data } = await axios.get('https://www.google.com/finance/quote/INFY:NSE', {
            headers: { 'Accept-Language': 'en-US' } // Ensure English
        });

        // Price
        const priceMatch = data.match(/<div class="YMlKec fxKbKc">([^<]+)<\/div>/);
        if (!priceMatch) { console.log('Price failed'); return; }

        const priceStr = priceMatch[1].replace(/[^0-9.]/g, '');
        const price = parseFloat(priceStr);
        console.log('Price:', price);

        // Previous Close
        // Use a simpler regex or index finding to be robust
        const prevMarker = 'Previous close</div>';
        const idx = data.indexOf(prevMarker);
        if (idx !== -1) {
            // Look ahead for "P6K39c"
            const searchContext = data.substring(idx, idx + 500);
            const valueMatch = searchContext.match(/<div class="P6K39c">([^<]+)<\/div>/);

            if (valueMatch) {
                const prevStr = valueMatch[1].replace(/[^0-9.]/g, '');
                const prevClose = parseFloat(prevStr);
                console.log('Prev Close:', prevClose);

                const change = ((price - prevClose) / prevClose) * 100;
                const sign = change >= 0 ? '+' : '';
                console.log(`Calculated Change: ${sign}${change.toFixed(2)}%`);
            } else {
                console.log('Prev Close value class "P6K39c" not found in context');
            }
        } else {
            console.log('Previous close marker not found');
        }

    } catch (e) { console.error(e.message); }
}
debug();
