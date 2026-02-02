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
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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
        const engineService = require('./services/engineService');
        const userId = String(req.user.id);

        // Get all trades from Python session
        const engineStatus = await engineService.getStatus(userId);
        const trades = engineStatus.trades_history || [];

        // Also try DB trades
        let dbTrades = [];
        try {
            const { Trade } = require('./models');
            dbTrades = await Trade.findAll({ where: { user_id: req.user.id } });
            dbTrades = dbTrades.map(t => ({ pnl: t.pnl || 0, date: t.createdAt }));
        } catch (e) { }

        const allTrades = [...trades, ...dbTrades];

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
        const winningTrades = allTrades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = allTrades.filter(t => (t.pnl || 0) < 0);

        const totalPnL = allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winRate = (winningTrades.length / allTrades.length) * 100;
        const avgProfit = totalPnL / allTrades.length;

        const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

        // Group by day
        const dailyMap = {};
        allTrades.forEach(t => {
            const day = t.date || 'Unknown';
            if (!dailyMap[day]) dailyMap[day] = 0;
            dailyMap[day] += t.pnl || 0;
        });

        const dailyPnL = Object.entries(dailyMap).map(([day, pnl]) => ({ day, pnl }));

        let bestDay = { pnl: 0, date: '-' };
        let worstDay = { pnl: 0, date: '-' };

        dailyPnL.forEach(d => {
            if (d.pnl > bestDay.pnl) bestDay = { pnl: d.pnl, date: d.day };
            if (d.pnl < worstDay.pnl) worstDay = { pnl: d.pnl, date: d.day };
        });

        res.json({
            total_trades: allTrades.length,
            win_rate: Math.round(winRate * 10) / 10,
            avg_profit_per_trade: Math.round(avgProfit * 100) / 100,
            profit_factor: Math.round(profitFactor * 100) / 100,
            best_day: bestDay,
            worst_day: worstDay,
            max_drawdown: 0, // Would need more complex calculation
            winning_trades: winningTrades.length,
            losing_trades: losingTrades.length,
            daily_pnl: dailyPnL.slice(-7) // Last 7 days
        });
    } catch (e) {
        console.error('Analytics error:', e);
        res.json({ status: 'error', message: e.message });
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
        const allTrades = [...liveTrades, ...dbTrades];

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

app.get('/pnl', verifyToken, tradingController.getPnL);
app.get('/trades', verifyToken, tradingController.getTrades);
app.get('/logs', verifyToken, tradingController.getLogs);

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
