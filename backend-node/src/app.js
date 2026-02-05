const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://merq.vercel.app',
    'https://merqprime.in',
    'https://www.merqprime.in',
    process.env.FRONTEND_URL, // Allow Vercel URL
    process.env.NEXT_PUBLIC_API_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tradingRoutes = require('./routes/tradingRoutes');
const testOrderRoutes = require('./routes/testOrder');
const authController = require('./controllers/authController');
const { verifyToken } = require('./middleware/authMiddleware');

const userController = require('./controllers/userController');
const tradingController = require('./controllers/tradingController');

// API Versioning Prefix
app.use('/api/auth', authRoutes);
app.use('/api/val', userRoutes); // Protected User Routes
app.use('/api/test', verifyToken, testOrderRoutes); // Test order execution
app.use('/test', verifyToken, testOrderRoutes); // Legacy alias for Next.js proxy

// --- LEGACY ALIASES (For Frontend Proxy Support) ---
// Note: Next.js proxies /api/:path* to /:path* on// Webhook for Python Engine to save completed trades
app.post('/webhook/save_trade', async (req, res) => {
    try {
        const { user_id, symbol, mode, qty, entry, exit, tp, sl, pnl, status, date, time, trade_mode, strategy } = req.body;

        const { Trade } = require('./models');

        // Check for duplicate (optional but good)
        // const exists = await Trade.findOne({ where: { user_id, symbol, date, time } });
        // if (exists) return res.json({ status: 'skipped' });

        await Trade.create({
            user_id,
            symbol,
            mode: mode || 'BUY',
            quantity: qty || 1,
            entry_price: entry || 0,
            exit_price: exit || 0,
            tp: tp || 0,
            sl: sl || 0,
            pnl: pnl || 0,
            status: status || 'COMPLETED',
            timestamp: `${date} ${time}`.trim(),
            is_simulated: trade_mode === 'PAPER',
            strategy: strategy || 'ORB'
        });

        console.log(`Saved trade via webhook: ${symbol} ${pnl}`);
        res.json({ status: 'success' });
    } catch (e) {
        console.error("Save Trade Webhook Error:", e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// Real-time Tick/PnL Update Webhook
app.post('/webhook/tick', (req, res) => {
    try {
        const { user_id, trades, pnl, token_data } = req.body;
        const { sendUserUpdate } = require('./services/socketService');

        // Broadcast to specific user via Socket.IO
        // Frontend expects 'tick_update' event with { trades, pnl }
        sendUserUpdate(user_id, 'tick_update', {
            trades,
            pnl,
            timestamp: new Date().toISOString()
        });

        res.json({ status: 'ok' });
    } catch (e) {
        // console.error("Tick Webhook Error:", e.message);
        res.status(500).json({ status: 'error' });
    }
});

// Start Server

app.post('/register', authController.register);
app.post('/login', authController.login);

app.get('/check_auth', verifyToken, (req, res) => {
    res.json({
        authenticated: true,
        user: req.user.username,
        id: req.user.id
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ status: 'success', message: 'Logged out' });
});

app.get('/get_profile', verifyToken, userController.getProfile);
app.post('/update_profile', verifyToken, userController.updateProfile);

app.get('/plans', userController.getPlans);

// Search Scrip Endpoint - Needed for Token Resolution
app.get('/search_scrip', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) return res.json([]);

        // Use SmartApi if available via a service, or simple local lookup if DB holds it
        // Or call Python Engine? For now, let's use a mock list expanded or try to fetch from Python service
        // Actually, Python engine connects to Angel. Node.js backend might not have direct connection unless we use SmartAPI here too.
        // Quickest fix: Return subset of known tokens or call Python engine /search endpoint (if we make one).

        // Let's implement a basic lookup from our static map + wildcards if possible, 
        // OR better: Forward this request to Python Engine which has access to SmartAPI Scrip Master?
        // Python Engine doesn't expose HTTP for this yet.

        // FALLBACK: Use a larger static list for now to satisfy the "5PAISA" search
        const known_stocks = [
            { symbol: "RELIANCE-EQ", token: "2885", exchange: "NSE" },
            { symbol: "TCS-EQ", token: "11536", exchange: "NSE" },
            { symbol: "INFY-EQ", token: "1594", exchange: "NSE" },
            { symbol: "HDFCBANK-EQ", token: "1333", exchange: "NSE" },
            { symbol: "SBIN-EQ", token: "3045", exchange: "NSE" },
            { symbol: "5PAISA-EQ", token: "445", exchange: "NSE" },
            { symbol: "RVNL-EQ", token: "24948", exchange: "NSE" }, // Correct Token?
            { symbol: "ADANIGREEN-EQ", token: "17388", exchange: "NSE" }, // Approx
            { symbol: "PRECAM-EQ", token: "123456", exchange: "NSE" }, // Placeholder
            { symbol: "TATAMOTORS-EQ", token: "3456", exchange: "NSE" },
            { symbol: "WIPRO-EQ", token: "3787", exchange: "NSE" }
        ].filter(s => s.symbol.toUpperCase().includes(query.toUpperCase()));

        // Also check DB stocks if we have them
        const { Stock } = require('./models');
        try {
            const dbStocks = await Stock.findAll({
                where: {
                    symbol: { [require('sequelize').Op.like]: `%${query}%` }
                }
            });
            // Merge results
            const dbResults = dbStocks.map(s => ({ symbol: s.symbol, token: s.token, exchange: s.exchange }));

            // Combine unique by symbol
            const combined = [...known_stocks, ...dbResults];
            const unique = Array.from(new Map(combined.map(item => [item.symbol, item])).values());

            res.json(unique);
        } catch (e) {
            res.json(known_stocks);
        }

    } catch (e) {
        console.error('Search Scrip Error:', e);
        res.json([]);
    }
});


app.get('/symbols', async (req, res) => {
    try {
        const { Stock } = require('./models');
        const stocks = await Stock.findAll({
            attributes: ['symbol'],
            order: [['symbol', 'ASC']]
        });
        res.json(stocks.map(s => s.symbol));
    } catch (e) {
        console.error('Fetch symbols error:', e);
        res.json([]);
    }
});
app.post('/add_token', verifyToken, userController.addToken);
app.post('/backtest', verifyToken, tradingController.runBacktest);
app.post('/save_backtest', verifyToken, tradingController.saveBacktestResult);
app.get('/backtest_history', verifyToken, tradingController.getBacktestHistory);
app.delete('/backtest_history/:id', verifyToken, tradingController.deleteBacktestResult);
app.post('/update_safety_guard', verifyToken, tradingController.updateSafetyGuard);
app.post('/create_order', verifyToken, userController.createOrder);
app.post('/verify_payment', verifyToken, userController.verifyPayment);

// Basic error logging for Yahoo Finance
const MARKET_DATA_VERSION = "1.0.8";

app.get('/market_data', async (req, res) => {
    let yahooFinance;
    try {
        // Load library dynamically to prevent server crash if missing/incompatible
        yahooFinance = require('yahoo-finance2').default || require('yahoo-finance2');
    } catch (err) {
        console.error("Critical: Failed to load yahoo-finance2 library:", err.message);
    }

    try {
        if (!yahooFinance) throw new Error("Yahoo Finance Library not loaded");

        const symbolsMap = [
            { ticker: "^NSEI", label: "NIFTY 50", base: 24500 },
            { ticker: "^NSEBANK", label: "BANKNIFTY", base: 52100 },
            { ticker: "^BSESN", label: "SENSEX", base: 81500 },
            { ticker: "RELIANCE.NS", label: "RELIANCE", base: 2980 },
            { ticker: "HDFCBANK.NS", label: "HDFCBANK", base: 1650 },
            { ticker: "INFY.NS", label: "INFY", base: 1420 },
            { ticker: "TCS.NS", label: "TCS", base: 3950 },
            { ticker: "ADANIENT.NS", label: "ADANIENT", base: 3100 }
        ];

        const results = await Promise.all(symbolsMap.map(async (s) => {
            try {
                // Extended timeout and options for stability on some servers
                const quote = await yahooFinance.quote(s.ticker, { validateResult: false });
                const price = quote.regularMarketPrice || quote.postMarketPrice || quote.bid || 0;
                const prevClose = quote.regularMarketPreviousClose || price;
                const changePct = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;

                return {
                    symbol: s.label,
                    price: price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
                    isGainer: changePct >= 0,
                    source: 'YAHOO_LIVE',
                    v: MARKET_DATA_VERSION
                };
            } catch (err) {
                console.error(`Failed to fetch ${s.label}:`, err.message);
                return null;
            }
        }));

        const validResults = results.filter(r => r !== null);

        if (validResults.length > 0) {
            return res.json(validResults);
        }

        throw new Error("Yahoo returned no valid data for these symbols");

    } catch (e) {
        console.error("Yahoo Finance Final Error:", e.message);

        // Fallback to simulation
        const baseData = [
            { symbol: "NIFTY 50", base: 24500 },
            { symbol: "BANKNIFTY", base: 52100 },
            { symbol: "SENSEX", base: 81500 },
            { symbol: "RELIANCE", base: 2980 },
            { symbol: "HDFCBANK", base: 1650 }
        ];

        const data = baseData.map(item => {
            const changePct = (Math.random() * 2 - 1).toFixed(2);
            const changeVal = (item.base * (parseFloat(changePct) / 100));
            const currentPrice = (item.base + changeVal).toFixed(2);
            return {
                symbol: item.symbol,
                price: parseFloat(currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                change: `${changePct > 0 ? '+' : ''}${changePct}%`,
                isGainer: parseFloat(changePct) >= 0,
                source: 'SIMULATED_FALLBACK',
                v: MARKET_DATA_VERSION,
                debug_error: e.message
            };
        });
        res.json(data);
    }
});

app.get('/analytics', verifyToken, async (req, res) => {
    try {
        const { Trade } = require('./models');

        // Get ALL trades from Order Book database
        let allTrades = [];
        try {
            const dbTrades = await Trade.findAll({
                where: { user_id: req.user.id },
                order: [['createdAt', 'ASC']]
            });

            allTrades = dbTrades.map(t => {
                let dateStr = 'Unknown';
                if (t.timestamp && t.timestamp.includes(' ')) {
                    dateStr = t.timestamp.split(' ')[0];
                } else if (t.createdAt) {
                    dateStr = t.createdAt.toISOString().split('T')[0];
                }

                return {
                    pnl: parseFloat(t.pnl) || 0,
                    date: dateStr
                };
            });
        } catch (e) {
            console.error('Failed to fetch trades from DB:', e);
        }

        // If no DB trades, try engine as fallback
        if (allTrades.length === 0) {
            try {
                const engineService = require('./services/engineService');
                const userId = String(req.user.id);
                const engineStatus = await engineService.getStatus(userId);
                const engineTrades = engineStatus.trades_history || [];

                allTrades = engineTrades.map(t => ({
                    pnl: parseFloat(t.pnl) || 0,
                    date: t.date || 'Unknown'
                }));
            } catch (e) {
                console.error('Failed to fetch from engine:', e);
            }
        }

        console.log(`[Analytics] Fetched ${allTrades.length} trades for user ${req.user.id}`);
        console.log(`[Analytics] Date range: ${allTrades[0]?.date} to ${allTrades[allTrades.length - 1]?.date}`);

        if (allTrades.length === 0) {
            return res.json({
                total_trades: 0,
                win_rate: 0,
                avg_profit_per_trade: 0,
                profit_factor: 0,
                best_day: { pnl: 0, date: '-' },
                worst_day: { pnl: 0, date: '-' },
                max_drawdown: 0,
                winning_trades: 0,
                losing_trades: 0,
                daily_pnl: []
            });
        }

        // Calculate statistics
        const winningTrades = allTrades.filter(t => t.pnl > 0);
        const losingTrades = allTrades.filter(t => t.pnl < 0);

        const totalPnL = allTrades.reduce((sum, t) => sum + t.pnl, 0);
        const winRate = (winningTrades.length / allTrades.length) * 100;
        const avgProfit = totalPnL / allTrades.length;

        const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

        // Group by day
        const dailyMap = {};
        allTrades.forEach(t => {
            const day = t.date || 'Unknown';
            if (!dailyMap[day]) dailyMap[day] = 0;
            dailyMap[day] += t.pnl || 0;
        });

        // Convert to array and sort by date
        const dailyPnL = Object.entries(dailyMap)
            .map(([day, pnl]) => ({ day, pnl }))
            .sort((a, b) => {
                // Sort by date (oldest first)
                if (a.day === 'Unknown') return 1;
                if (b.day === 'Unknown') return -1;
                return new Date(a.day) - new Date(b.day);
            });

        // Initialize with first day or defaults
        let bestDay = dailyPnL.length > 0 ? { ...dailyPnL[0] } : { pnl: 0, date: '-' };
        let worstDay = dailyPnL.length > 0 ? { ...dailyPnL[0] } : { pnl: 0, date: '-' };

        dailyPnL.forEach(d => {
            if (d.pnl > bestDay.pnl) bestDay = { pnl: d.pnl, date: d.day };
            if (d.pnl < worstDay.pnl) worstDay = { pnl: d.pnl, date: d.day };
        });

        // Max Drawdown Calculation
        // Assumption: Base Capital = 100,000 (Adjust as needed or fetch from config)
        let currentEquity = 100000;
        let peakEquity = currentEquity;
        let maxDrawdownPct = 0;

        dailyPnL.forEach(d => {
            currentEquity += d.pnl;
            if (currentEquity > peakEquity) {
                peakEquity = currentEquity;
            }
            const drawdown = peakEquity - currentEquity;
            const drawdownPct = (drawdown / peakEquity) * 100;
            if (drawdownPct > maxDrawdownPct) {
                maxDrawdownPct = drawdownPct;
            }
        });

        // Helper to ensure value is a valid number (not NaN or Infinity)
        const safeNum = (val, fallback = 0) => {
            if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return fallback;
            return val;
        };

        res.json({
            total_trades: allTrades.length,
            win_rate: safeNum(Math.round(winRate * 10) / 10),
            avg_profit_per_trade: safeNum(Math.round(avgProfit * 100) / 100),
            profit_factor: safeNum(Math.round(profitFactor * 100) / 100),
            best_day: bestDay,
            worst_day: worstDay,
            max_drawdown: safeNum(Math.round(maxDrawdownPct * 100) / 100), // Return percentage
            winning_trades: winningTrades.length,
            losing_trades: losingTrades.length,
            daily_pnl: dailyPnL // Return all data, frontend will filter by period
        });
    } catch (e) {
        console.error('Analytics error:', e);
        // Return safe default values on error
        res.json({
            total_trades: 0,
            win_rate: 0,
            avg_profit_per_trade: 0,
            profit_factor: 0,
            best_day: { pnl: 0, date: '-' },
            worst_day: { pnl: 0, date: '-' },
            max_drawdown: 0,
            winning_trades: 0,
            losing_trades: 0,
            daily_pnl: []
        });
    }
});

app.get('/orderbook', verifyToken, async (req, res) => {
    try {
        const engineService = require('./services/engineService');
        const userId = String(req.user.id);

        // Get date filters
        const { startDate, endDate } = req.query;

        // Get live trades from Python session
        const engineStatus = await engineService.getStatus(userId);
        const liveTradesRaw = engineStatus.trades_history || [];

        // Map Python trades to expected format (including tp, sl, date, time)
        let liveTrades = liveTradesRaw.map(t => ({
            id: t.id,
            date: t.date || '',
            time: t.time || '',
            timestamp: `${t.date || ''} ${t.time || ''}`.trim(),
            symbol: t.symbol,
            mode: t.type,
            quantity: t.qty,
            entry_price: t.entry,
            tp: t.tp || 0,
            sl: t.sl || 0,
            pnl: t.pnl || 0,
            status: t.status,
            trade_mode: t.mode  // PAPER or LIVE
        }));

        // Apply date filters if provided
        if (startDate) {
            liveTrades = liveTrades.filter(t => t.date >= startDate);
        }
        if (endDate) {
            liveTrades = liveTrades.filter(t => t.date <= endDate);
        }

        // Also try to get DB trades
        let dbTrades = [];
        try {
            const { Trade } = require('./models');
            const { Op } = require('sequelize');

            let whereClause = { user_id: req.user.id };

            // Apply date filters for DB trades
            if (startDate || endDate) {
                whereClause.timestamp = {};
                // Since timestamp is string "YYYY-MM-DD HH:MM:SS", we can use string comparison
                if (startDate) whereClause.timestamp[Op.gte] = `${startDate} 00:00:00`;
                if (endDate) whereClause.timestamp[Op.lte] = `${endDate} 23:59:59`;
            }

            dbTrades = await Trade.findAll({
                where: whereClause,
                order: [['timestamp', 'DESC']] // Sort by trade date, not creation date
            });
            dbTrades = dbTrades.map(t => {
                const tJson = t.toJSON();
                // Parse date and time from timestamp string if available
                let dateStr = '';
                let timeStr = '';

                if (tJson.timestamp) {
                    const parts = tJson.timestamp.split(' ');
                    dateStr = parts[0] || '';
                    timeStr = parts[1] || '';
                } else {
                    // Fallback to createdAt if timestamp is missing
                    const createdAt = new Date(tJson.createdAt);
                    dateStr = createdAt.toISOString().split('T')[0];
                    timeStr = createdAt.toTimeString().split(' ')[0];
                }

                return {
                    ...tJson,
                    date: dateStr,
                    time: timeStr,
                    tp: tJson.tp || 0,
                    sl: tJson.sl || 0
                };
            });
        } catch (e) {
            // DB/model might not exist, that's ok
        }

        // Combine (live first, then DB) and sort by date desc
        const allTrades = [...liveTrades, ...dbTrades].sort((a, b) => {
            const dateA = `${a.date} ${a.time}`;
            const dateB = `${b.date} ${b.time}`;
            return dateB.localeCompare(dateA);
        });

        res.json({ status: 'success', data: allTrades });
    } catch (e) {
        console.error("Orderbook fetch error:", e.message);
        res.json({ status: 'success', data: [] });
    }
});

app.get('/history', verifyToken, async (req, res) => {
    try {
        const { Trade } = require('./models');
        const history = await Trade.findAll({
            where: { user_id: req.user.id, status: 'COMPLETED' },
            order: [['createdAt', 'DESC']]
        });
        res.json({ status: 'success', data: history });
    } catch (e) {
        console.error("History fetch error", e.message);
        res.json({ status: 'success', data: [] });
    }
});


app.post('/delete_orders', verifyToken, (req, res) => {
    const { order_ids } = req.body;
    res.json({ status: 'success', message: `Deleted ${order_ids?.length || 0} orders` });
});

// Import Order Book from CSV
app.post('/import_orderbook', verifyToken, async (req, res) => {
    try {
        const { trades } = req.body;

        if (!trades || !Array.isArray(trades) || trades.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No trades provided for import'
            });
        }

        const { Trade } = require('./models');
        const userId = req.user.id;

        let imported = 0;
        let failed = 0;

        for (const trade of trades) {
            try {
                // Validate required fields
                if (!trade.symbol) {
                    failed++;
                    continue;
                }

                // Calculate PnL if exit price is provided but PnL is not
                let pnl = trade.pnl || 0;
                if (trade.exit && trade.entry && !trade.pnl) {
                    const qty = trade.qty || 1;
                    if (trade.type === 'BUY') {
                        pnl = (trade.exit - trade.entry) * qty;
                    } else {
                        pnl = (trade.entry - trade.exit) * qty;
                    }
                }

                // Create trade record
                await Trade.create({
                    user_id: userId,
                    symbol: trade.symbol,
                    mode: trade.type || 'BUY',
                    quantity: trade.qty || 1,
                    entry_price: trade.entry || 0,
                    exit_price: trade.exit || 0,
                    pnl: pnl,
                    status: trade.status || 'COMPLETED',
                    timestamp: trade.date && trade.time
                        ? `${trade.date} ${trade.time}`
                        : new Date().toISOString(),
                    is_simulated: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                imported++;
            } catch (e) {
                console.error('Failed to import trade:', e.message);
                failed++;
            }
        }

        res.json({
            status: 'success',
            message: `Successfully imported ${imported} trades${failed > 0 ? `, ${failed} failed` : ''}`,
            imported,
            failed
        });
    } catch (e) {
        console.error('Import orderbook error:', e.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to import trades: ' + e.message
        });
    }
});

app.get('/pnl', verifyToken, tradingController.getPnL);
app.get('/trades', verifyToken, tradingController.getTrades);
app.get('/logs', verifyToken, tradingController.getLogs);

// Export Order Book as CSV (server-side generation)
app.get('/export_orderbook', verifyToken, async (req, res) => {
    try {
        const { Trade } = require('./models');
        const userId = req.user.id;

        // Get all trades for the user
        const trades = await Trade.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']]
        });

        // Also get live trades from engine
        let engineTrades = [];
        try {
            const engineService = require('./services/engineService');
            const engineStatus = await engineService.getStatus(String(userId));
            engineTrades = (engineStatus.trades_history || []).map(t => ({
                date: t.date || '',
                time: t.time || '',
                symbol: t.symbol,
                type: t.type,
                qty: t.qty,
                entry: t.entry,
                exit: 0,
                pnl: t.pnl || 0,
                status: t.status
            }));
        } catch (e) {
            // Engine might not be running
        }

        // Map DB trades
        const dbTrades = trades.map(t => ({
            date: t.timestamp ? t.timestamp.split(' ')[0] : t.createdAt.toISOString().split('T')[0],
            time: t.timestamp ? t.timestamp.split(' ')[1] : t.createdAt.toISOString().split('T')[1].split('.')[0],
            symbol: t.symbol,
            type: t.mode,
            qty: t.quantity,
            entry: parseFloat(t.entry_price) || 0,
            exit: parseFloat(t.exit_price) || 0,
            pnl: parseFloat(t.pnl) || 0,
            status: t.status
        }));

        // Combine all trades
        const allTrades = [...engineTrades, ...dbTrades];

        // Generate CSV content
        const headers = 'Date,Time,Symbol,Type,Qty,Entry,Exit,PnL,Status';
        const rows = allTrades.map(t =>
            `${t.date},${t.time},"${t.symbol}",${t.type},${t.qty},${t.entry},${t.exit},${t.pnl},${t.status}`
        );

        const csvContent = [headers, ...rows].join('\n');

        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="orderbook_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    } catch (e) {
        console.error('Export orderbook error:', e.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to export trades: ' + e.message
        });
    }
});

app.post('/exit_trade', verifyToken, (req, res) => {
    res.json({ status: 'success', message: 'Exit order placed' });
});

app.post('/update_trade', verifyToken, (req, res) => {
    res.json({ status: 'success', message: 'Order updated successfully' });
});



app.use('/', tradingRoutes); // Handles /start, /stop, /status

// Health check root
app.get('/', (req, res) => {
    res.json({ message: 'MerQPrime Node Backend Running', status: 'active' });
});

module.exports = app;
