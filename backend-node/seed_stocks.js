const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/db');
const Stock = require('./src/models/Stock');

const seedStocks = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database Connected.');
        await Stock.sync({ force: true }); // Reset table
        console.log('Stock table reset.');

        const filePath = path.join(__dirname, 'token -symbol.txt');
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            process.exit(1);
        }

        const data = fs.readFileSync(filePath, 'utf-8');
        const lines = data.split(/\r?\n/);

        const seenSymbols = new Set();
        const stocks = [];
        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Format: token symbol (space separated)
            // e.g. 16921 20MICRONS-EQ
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const token = parts[0];
                const symbol = parts[1];
                if (!seenSymbols.has(symbol)) {
                    stocks.push({ token, symbol, exchange: 'NSE' });
                    seenSymbols.add(symbol);
                }
            }
        }

        if (stocks.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < stocks.length; i += chunkSize) {
                const chunk = stocks.slice(i, i + chunkSize);
                try {
                    await Stock.bulkCreate(chunk);
                    console.log(`Inserted batch ${i} to ${i + chunk.length}`);
                } catch (batchErr) {
                    console.error(`Batch ${i} failed:`, batchErr.message);
                }
            }
            console.log(`Total inserted ${stocks.length} stocks.`);
        } else {
            console.log('No stocks found to insert.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Seeding stocks failed:', error);
        process.exit(1);
    }
};

seedStocks();
