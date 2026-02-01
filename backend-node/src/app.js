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
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const tradingRoutes = require('./routes/tradingRoutes');
const authController = require('./controllers/authController');
const { verifyToken } = require('./middleware/authMiddleware');

const userController = require('./controllers/userController');

// API Versioning Prefix
app.use('/api/auth', authRoutes);
app.use('/api/val', userRoutes); // Protected User Routes
app.use('/api/internal', webhookRoutes); // Internal Python Events

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

app.get('/plans', (req, res) => {
    res.json([
        {
            id: 1,
            plan: 'Basic',
            name: 'Basic',
            price: 0,
            duration: 'Monthly',
            features: ['Live Trading', 'Standard Support', '5 Backtests/day']
        },
        {
            id: 2,
            plan: 'Pro',
            name: 'Pro',
            price: 2000,
            duration: 'Monthly',
            features: ['Advanced Strategies', 'Priority Support', 'Unlimited Backtests', 'Real-time Alerts']
        }
    ]);
});

app.get('/symbols', (req, res) => {
    res.json(["NIFTY", "BANKNIFTY", "RELIANCE", "HDFCBANK", "ICICIBANK"]);
});

app.get('/market_data', (req, res) => {
    res.json([
        { symbol: "NIFTY 50", price: "24,500.00", change: "+0.50%", isGainer: true },
        { symbol: "BANKNIFTY", price: "52,100.00", change: "-0.20%", isGainer: false }
    ]);
});

app.get('/analytics', verifyToken, (req, res) => {
    res.json({
        total_trades: 42,
        win_rate: 64.5,
        avg_profit_per_trade: 1250,
        profit_factor: 1.85,
        best_day: { pnl: 15400, date: '2024-01-25' },
        worst_day: { pnl: -6200, date: '2024-01-18' },
        max_drawdown: 12.4,
        winning_trades: 27,
        losing_trades: 15,
        daily_pnl: [
            { day: 'Mon', pnl: 4500 },
            { day: 'Tue', pnl: -2100 },
            { day: 'Wed', pnl: 8900 },
            { day: 'Thu', pnl: 3400 },
            { day: 'Fri', pnl: -1200 },
            { day: 'Sat', pnl: 0 },
            { day: 'Sun', pnl: 0 }
        ]
    });
});

app.get('/orderbook', verifyToken, (req, res) => {
    res.json({
        status: 'success',
        data: [
            { id: 101, timestamp: '2024-01-30 09:15:22', symbol: 'RELIANCE', mode: 'BUY', quantity: 10, entry_price: 2500.50, pnl: 450.00, status: 'COMPLETED' },
            { id: 102, timestamp: '2024-01-30 10:22:15', symbol: 'HDFCBANK', mode: 'SELL', quantity: 50, entry_price: 1650.20, pnl: -120.50, status: 'COMPLETED' },
            { id: 103, timestamp: '2024-01-30 11:45:10', symbol: 'SBIN', mode: 'BUY', quantity: 100, entry_price: 610.15, pnl: 0, status: 'PENDING' },
            { id: 104, timestamp: '2024-01-29 14:10:05', symbol: 'TCS', mode: 'BUY', quantity: 5, entry_price: 3850.00, pnl: 1250.00, status: 'COMPLETED' },
            { id: 105, timestamp: '2024-01-29 15:25:30', symbol: 'INFY', mode: 'SELL', quantity: 20, entry_price: 1540.60, pnl: 320.40, status: 'COMPLETED' }
        ]
    });
});

app.post('/delete_orders', verifyToken, (req, res) => {
    const { order_ids } = req.body;
    res.json({ status: 'success', message: `Deleted ${order_ids?.length || 0} orders` });
});

app.get('/pnl', verifyToken, (req, res) => {
    res.json({ pnl: 2450.75 });
});

app.get('/trades', verifyToken, (req, res) => {
    res.json({
        status: 'success',
        data: [
            { entry_order_id: 'ORD001', timestamp: '2024-01-30 09:15:22', symbol: 'RELIANCE', mode: 'BUY', quantity: 10, entry_price: 2500.50, tp: 2550, sl: 2480, pnl: 450.00 },
            { entry_order_id: 'ORD002', timestamp: '2024-01-30 10:22:15', symbol: 'HDFCBANK', mode: 'SELL', quantity: 50, entry_price: 1650.20, tp: 1600, sl: 1670, pnl: -120.50 }
        ]
    });
});

app.get('/logs', verifyToken, (req, res) => {
    res.json([
        '09:15:00 - SUCCESS - System Startup Complete',
        '09:15:22 - INFO - [RELIANCE] Entry Condition Met - BUY 10 qty @ 2500.50',
        '10:22:15 - INFO - [HDFCBANK] Entry Condition Met - SELL 50 qty @ 1650.20',
        '11:45:10 - WARNING - Connection latency detected: 250ms',
        '12:30:00 - INFO - Running strategy heartbeat...'
    ]);
});

app.post('/exit_trade', verifyToken, (req, res) => {
    res.json({ status: 'success', message: 'Exit order placed' });
});

app.post('/update_trade', verifyToken, (req, res) => {
    res.json({ status: 'success', message: 'Order updated successfully' });
});

app.get('/config', verifyToken, (req, res) => {
    res.json({
        symbols: ['RELIANCE', 'TCS'],
        strategy: 'orb',
        interval: 'FIFTEEN_MINUTE',
        startTime: '09:15',
        stopTime: '15:15',
        capital: '100000'
    });
});

app.use('/', tradingRoutes); // Handles /start, /stop, /status

// Health check root
app.get('/', (req, res) => {
    res.json({ message: 'MerQPrime Node Backend Running', status: 'active' });
});

module.exports = app;
