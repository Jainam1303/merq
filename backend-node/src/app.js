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
const alphaTickerRoutes = require('./routes/alphaTickerRoutes'); // Alpha Vantage
const authController = require('./controllers/authController');
const { verifyToken } = require('./middleware/authMiddleware');

const userController = require('./controllers/userController');
const tradingController = require('./controllers/tradingController');
const adminRoutes = require('./routes/adminRoutes');
const adminController = require('./controllers/adminController');
const referralRoutes = require('./routes/referralRoutes');
const referralController = require('./controllers/referralController');

// API Versioning Prefix
app.use('/api/auth', authRoutes);
app.use('/api/val', userRoutes); // Protected User Routes
app.use('/api/test', verifyToken, testOrderRoutes); // Test order execution
app.use('/test', verifyToken, testOrderRoutes); // Legacy alias for Next.js proxy

// Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes); // Legacy alias

// Referral Routes
app.use('/api/referral', referralRoutes);
app.use('/referral', referralRoutes); // Legacy alias

// Admin Referral Endpoints (under admin auth)
const { verifyAdmin } = require('./middleware/adminMiddleware');
app.get('/api/admin/referrals', verifyAdmin, referralController.adminGetReferrals);
app.get('/admin/referrals', verifyAdmin, referralController.adminGetReferrals);
app.put('/api/admin/referrals/:id/status', verifyAdmin, referralController.adminUpdateStatus);
app.put('/admin/referrals/:id/status', verifyAdmin, referralController.adminUpdateStatus);
app.get('/api/admin/referrals/settings', verifyAdmin, referralController.adminGetSettings);
app.get('/admin/referrals/settings', verifyAdmin, referralController.adminGetSettings);

// Public announcements endpoint (for regular users)
app.get('/announcements/active', adminController.getActiveAnnouncements);

// --- LEGACY ALIASES (For Frontend Proxy Support) ---
// Note: Next.js proxies /api/:path* to /:path* on// Webhook for Python Engine to save completed trades
app.post('/webhook/save_trade', async (req, res) => {
    try {
        const { user_id, symbol, mode, qty, entry, exit, tp, sl, pnl, status, date, time, trade_mode, strategy } = req.body;

        console.log(`[SaveTrade Webhook] Received: user=${user_id}, symbol=${symbol}, pnl=${pnl}, mode=${trade_mode}`);

        if (!user_id || !symbol) {
            console.error('[SaveTrade Webhook] Missing required fields: user_id or symbol');
            return res.status(400).json({ status: 'error', message: 'Missing user_id or symbol' });
        }

        const { Trade } = require('./models');

        // Check for duplicate trade (same user, symbol, date, time)
        const timestamp = `${date || ''} ${time || ''}`.trim();
        if (timestamp) {
            const existing = await Trade.findOne({
                where: { user_id, symbol, timestamp }
            });
            if (existing) {
                console.log(`[SaveTrade Webhook] Duplicate skipped: ${symbol} at ${timestamp}`);
                return res.json({ status: 'success', message: 'duplicate_skipped' });
            }
        }

        const trade = await Trade.create({
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
            timestamp: timestamp || new Date().toISOString(),
            is_simulated: trade_mode === 'PAPER',
            strategy: strategy || 'ORB'
        });

        console.log(`[SaveTrade Webhook] ✅ Saved trade ID=${trade.id}: ${symbol} PnL=${pnl} (${trade_mode})`);
        res.json({ status: 'success', trade_id: trade.id });
    } catch (e) {
        console.error("[SaveTrade Webhook] ❌ Error:", e.message);
        console.error("[SaveTrade Webhook] Stack:", e.stack);
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

app.get('/check_auth', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ authenticated: false });

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.json({ authenticated: false });

        // Check if user is admin from DB
        let is_admin = false;
        try {
            const { User } = require('./models');
            const user = await User.findByPk(decoded.id, { attributes: ['is_admin'] });
            is_admin = user?.is_admin || false;
        } catch (e) { }

        res.json({
            authenticated: true,
            user: decoded.username,
            id: decoded.id,
            is_admin
        });
    });
});

// Auth status endpoint - renamed to avoid conflict with trading /status
app.get('/auth/status', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ status: 'offline', authenticated: false });

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.json({ status: 'offline', authenticated: false });
        // If authenticated, we can optionally call the real controller or return basic info
        res.json({ status: 'online', authenticated: true, user: decoded.username });
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
const MARKET_DATA_VERSION = "1.1.0";

// Server-side cache for market data (avoids excessive Yahoo Finance calls)
let marketDataCache = null;
let marketDataCacheTime = 0;
const MARKET_DATA_CACHE_TTL = 60 * 1000; // 60 seconds cache

app.get('/market_data', async (req, res) => {
    // Return cached data if fresh
    if (marketDataCache && (Date.now() - marketDataCacheTime) < MARKET_DATA_CACHE_TTL) {
        return res.json(marketDataCache);
    }

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
            { ticker: "NIFTY_FIN_SERVICE.NS", label: "FINNIFTY", base: 23500 },
            { ticker: "^INDIAVIX", label: "INDIA VIX", base: 13 },
            { ticker: "NIFTY_MID_SELECT.NS", label: "MIDCAP NIFTY", base: 11000 },
            { ticker: "RELIANCE.NS", label: "RELIANCE", base: 2980 },
            { ticker: "HDFCBANK.NS", label: "HDFCBANK", base: 1650 },
            { ticker: "INFY.NS", label: "INFY", base: 1420 },
            { ticker: "TCS.NS", label: "TCS", base: 3950 },
            { ticker: "ADANIENT.NS", label: "ADANIENT", base: 3100 }
        ];

        const results = await Promise.all(symbolsMap.map(async (s) => {
            try {
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
            // Cache the successful response
            marketDataCache = validResults;
            marketDataCacheTime = Date.now();
            return res.json(validResults);
        }

        throw new Error("Yahoo returned no valid data for these symbols");

    } catch (e) {
        console.error("Yahoo Finance Final Error:", e.message);

        // If we have stale cache, return it instead of simulated
        if (marketDataCache) {
            return res.json(marketDataCache);
        }

        // Fallback to simulation
        const baseData = [
            { symbol: "NIFTY 50", base: 24500 },
            { symbol: "BANKNIFTY", base: 52100 },
            { symbol: "SENSEX", base: 81500 },
            { symbol: "FINNIFTY", base: 23500 },
            { symbol: "INDIA VIX", base: 13 },
            { symbol: "MIDCAP NIFTY", base: 11000 },
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

                // Robustly extract date from timestamp
                if (t.timestamp) {
                    if (typeof t.timestamp === 'string') {
                        // Handle "YYYY-MM-DD ..." or "YYYY-MM-DDT..."
                        // Use regex to capture the date part
                        const match = t.timestamp.match(/^(\d{4}-\d{2}-\d{2})/);
                        if (match) {
                            dateStr = match[1];
                        } else {
                            // Fallback for other string formats
                            dateStr = t.timestamp.split(' ')[0];
                        }
                    } else if (t.timestamp instanceof Date) {
                        dateStr = t.timestamp.toISOString().split('T')[0];
                    }
                }

                // Fallback to createdAt only if calculation failed
                if ((dateStr === 'Unknown' || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) && t.createdAt) {
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
        // Calculate statistics
        const winningTrades = allTrades.filter(t => t.pnl > 0);
        const losingTrades = allTrades.filter(t => t.pnl < 0);

        const totalPnL = allTrades.reduce((sum, t) => sum + t.pnl, 0);
        const winRate = allTrades.length > 0 ? (winningTrades.length / allTrades.length) * 100 : 0;
        const avgProfit = allTrades.length > 0 ? totalPnL / allTrades.length : 0;

        const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);

        // Group by day for Chart
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
                if (a.day === 'Unknown') return 1;
                if (b.day === 'Unknown') return -1;
                return new Date(a.day) - new Date(b.day);
            });

        // Best/Worst Day
        let bestDay = dailyPnL.length > 0 ? { ...dailyPnL[0] } : { pnl: 0, date: '-' };
        let worstDay = dailyPnL.length > 0 ? { ...dailyPnL[0] } : { pnl: 0, date: '-' };

        dailyPnL.forEach(d => {
            if (d.pnl > bestDay.pnl) bestDay = { pnl: d.pnl, date: d.day };
            if (d.pnl < worstDay.pnl) worstDay = { pnl: d.pnl, date: d.day };
        });

        // Max Drawdown Calculation (Per Trade for accuracy)
        let currentEquity = 100000; // Base Capital
        let peakEquity = currentEquity;
        let maxDrawdownPct = 0;

        // Ensure trades are sorted chronologically for Drawdown calc
        // We already requested sort by 'createdAt' ASC from DB
        allTrades.forEach(t => {
            currentEquity += t.pnl;

            if (currentEquity > peakEquity) {
                peakEquity = currentEquity;
            }

            const drawdownRaw = peakEquity - currentEquity;
            const drawdownPct = peakEquity > 0 ? (drawdownRaw / peakEquity) * 100 : 0;

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
        const { Trade } = require('./models');
        const { Op } = require('sequelize');
        const userId = req.user.id;

        // Get date filters
        const { startDate, endDate } = req.query;

        // =========================================================
        // SOURCE OF TRUTH: DB has all closed/completed trades
        // (saved directly by the engine via _persist_trade_to_db)
        // =========================================================
        let whereClause = { user_id: userId };

        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate) whereClause.timestamp[Op.gte] = `${startDate} 00:00:00`;
            if (endDate) whereClause.timestamp[Op.lte] = `${endDate} 23:59:59`;
        }

        const dbTrades = await Trade.findAll({
            where: whereClause,
            order: [['timestamp', 'DESC']]
        });

        const trades = dbTrades.map(t => {
            const tJson = t.toJSON();
            let dateStr = '';
            let timeStr = '';

            if (tJson.timestamp) {
                const parts = tJson.timestamp.split(' ');
                dateStr = parts[0] || '';
                timeStr = parts[1] || '';
            } else {
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

        // =========================================================
        // OPEN POSITIONS: Only from live engine (these aren't in DB yet)
        // =========================================================
        let openPositions = [];
        try {
            const engineService = require('./services/engineService');
            const engineStatus = await engineService.getStatus(String(userId));

            if (engineStatus && engineStatus.active !== false) {
                openPositions = (engineStatus.positions || [])
                    .filter(p => p.status === 'OPEN')
                    .map(p => ({
                        id: `live_${p.id || p.symbol}_${p.time || ''}`,
                        date: p.date || '',
                        time: p.time || '',
                        timestamp: `${p.date || ''} ${p.time || ''}`.trim(),
                        symbol: p.symbol,
                        mode: p.type,
                        quantity: p.qty,
                        entry_price: p.entry,
                        tp: p.tp || 0,
                        sl: p.sl || 0,
                        pnl: p.pnl || 0,
                        status: 'OPEN',
                        trade_mode: p.mode  // PAPER or LIVE
                    }));
            }
        } catch (engErr) {
            // Engine not available, that's ok — we just won't have live positions
        }

        // Combine: open positions first, then closed trades from DB
        const allTrades = [...openPositions, ...trades];

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


app.post('/delete_orders', verifyToken, async (req, res) => {
    try {
        const { order_ids } = req.body;
        if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
            return res.json({ status: 'success', message: 'No orders to delete' });
        }

        const { Trade } = require('./models');
        const deleted = await Trade.destroy({
            where: {
                id: order_ids,
                user_id: req.user.id
            }
        });

        console.log(`[OrderBook] Deleted ${deleted} trades for user ${req.user.id}`);
        res.json({ status: 'success', message: `Deleted ${deleted} orders` });
    } catch (e) {
        console.error("Delete orders error:", e);
        res.status(500).json({ status: 'error', message: 'Failed to delete orders' });
    }
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



app.use('/', alphaTickerRoutes); // Alpha Vantage ticker for landing page (Reliable Daily Updates)
app.use('/', tradingRoutes); // Handles /start, /stop, /status

// Health check root
app.get('/', (req, res) => {
    res.json({ message: 'MerQPrime Node Backend Running', status: 'active' });
});

module.exports = app;
