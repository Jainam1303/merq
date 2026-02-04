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
const authController = require('./controllers/authController');
const { verifyToken } = require('./middleware/authMiddleware');

const userController = require('./controllers/userController');
const tradingController = require('./controllers/tradingController');

// API Versioning Prefix
app.use('/api/auth', authRoutes);
app.use('/api/val', userRoutes); // Protected User Routes

// --- LEGACY ALIASES (For Frontend Proxy Support) ---
// Note: Next.js proxies /api/:path* to /:path* on this server

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

app.get('/market_data', (req, res) => {
    res.json([
        { symbol: "NIFTY 50", price: "24,500.00", change: "+0.50%", isGainer: true },
        { symbol: "BANKNIFTY", price: "52,100.00", change: "-0.20%", isGainer: false }
    ]);
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

        // Get live trades from Python session
        const engineStatus = await engineService.getStatus(userId);
        const liveTradesRaw = engineStatus.trades_history || [];

        // Map Python trades to expected format
        const liveTrades = liveTradesRaw.map(t => ({
            id: t.id,
            timestamp: `${t.date || ''} ${t.time || ''}`.trim(),
            symbol: t.symbol,
            mode: t.type,
            quantity: t.qty,
            entry_price: t.entry,
            pnl: t.pnl || 0,
            status: t.status,
            trade_mode: t.mode  // PAPER or LIVE
        }));

        // Also try to get DB trades
        let dbTrades = [];
        try {
            const { Trade } = require('./models');
            dbTrades = await Trade.findAll({ where: { user_id: req.user.id } });
            dbTrades = dbTrades.map(t => t.toJSON());
        } catch (e) {
            // DB/model might not exist, that's ok
        }

        // Combine (live first, then DB)
        let allTrades = [...liveTrades, ...dbTrades];

        // FILTER BY DATE
        const { startDate, endDate } = req.query;
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999); // Include full end day

            allTrades = allTrades.filter(t => {
                let tradeDateStr = '';
                if (t.timestamp) {
                    if (t.timestamp instanceof Date) tradeDateStr = t.timestamp.toISOString().split('T')[0];
                    else tradeDateStr = t.timestamp.split(' ')[0];
                } else if (t.date) {
                    tradeDateStr = t.date;
                } else if (t.createdAt) {
                    tradeDateStr = new Date(t.createdAt).toISOString().split('T')[0];
                }

                if (!tradeDateStr) return true; // Keep if no date (safety)

                const tradeDate = new Date(tradeDateStr);

                if (start && tradeDate < start) return false;
                if (end && tradeDate > end) return false;

                return true;
            });
        }

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
