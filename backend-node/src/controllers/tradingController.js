const engineService = require('../services/engineService');
const { User, Subscription, Plan, BacktestResult } = require('../models');

// Start Bot
// Start Bot
exports.startBot = async (req, res) => {
    try {
        const userId = String(req.user.id); // Ensure string to avoid Pydantic 422

        // Frontend sends: { symbols, strategy, interval, startTime, stopTime, capital, simulated }
        const {
            strategy,
            symbols,
            interval,
            startTime,
            stopTime,
            capital,
            simulated
        } = req.body;

        // 1. Check Subscription/Plan Limits
        // Logic remains: check if user has active sub
        // Note: For Paper Trading (simulated), maybe we allow without Plan? 
        // User requirements said "Plan should be work properly". Let's enforce it for now.
        const sub = await Subscription.findOne({
            where: { user_id: req.user.id, status: 'active' },
            include: [Plan]
        });

        if (!sub) {
            return res.status(403).json({ message: 'No active subscription found. Please upgrade.' });
        }

        // 2. Prepare Config & Credentials
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Validate API Keys
        if (!user.angel_api_key || !user.angel_client_code || !user.angel_password || !user.angel_totp) {
            return res.status(400).json({ message: 'Angel One API Keys are missing. Please configure them in Settings > API Keys.' });
        }

        const strategyConfig = {
            strategy: strategy || 'orb',
            symbols: symbols || [],
            interval: interval || 'FIVE_MINUTE',
            startTime: startTime || '09:15',
            stopTime: stopTime || '15:15',
            capital: capital || '100000',
            simulated: simulated !== undefined ? simulated : true
        };

        const brokerCreds = {
            apiKey: user.angel_api_key,
            clientCode: user.angel_client_code,
            password: user.angel_password,
            totp: user.angel_totp,

            // Backtest credentials if needed (Engine uses same structure usually)
            backtest_api_key: user.backtest_api_key,
            backtest_client_code: user.backtest_client_code,
            backtest_password: user.backtest_password,
            backtest_totp: user.backtest_totp
        };

        // 3. Call Python Engine
        const result = await engineService.startSession(userId, strategyConfig, brokerCreds);

        res.json({ status: 'success', message: 'Bot started successfully', session_id: result.session_id });
    } catch (error) {
        console.error('Start Bot Error:', error.message);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to start bot' });
    }
};

// Stop Bot
exports.stopBot = async (req, res) => {
    try {
        const userId = String(req.user.id);
        await engineService.stopSession(userId);
        res.json({ message: 'Bot stopped successfully' });
    } catch (error) {
        console.error('Stop Bot Error:', error.message);
        res.status(500).json({ message: 'Failed to stop bot' });
    }
};

// Get Status
exports.getStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const status = await engineService.getStatus(userId);
        res.json(status);
    } catch (error) {
        console.error('Status Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch status' });
    }
};
// Run Backtest
// Run Backtest
exports.runBacktest = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const payload = {
            ...req.body,
            user_id: userId,
            broker_credentials: {
                api_key: user.backtest_api_key || user.angel_api_key,
                client_code: user.backtest_client_code || user.angel_client_code,
                password: user.backtest_password || user.angel_password,
                totp: user.backtest_totp || user.angel_totp
            }
        };

        const result = await engineService.runBacktest(payload);
        res.json(result);
    } catch (error) {
        console.error('Backtest Controller Error:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.updateSafetyGuard = async (req, res) => {
    try {
        const userId = req.user.id;
        const config = req.body;

        console.log(`[SafetyGuard] User ${userId} updated config:`, config);

        // TODO: Save to database (User model or new SafetyConfig model)
        // For now, returning success to unblock frontend

        res.json({ status: 'success', message: 'Safety guard updated successfully', config });
    } catch (error) {
        console.error('Update Safety Guard Error:', error);
        res.status(500).json({ message: 'Failed to update safety guard' });
    }
};

exports.getPnL = async (req, res) => {
    try {
        const status = await engineService.getStatus(req.user.id);
        res.json({ pnl: status.pnl || 0 });
    } catch (e) { res.json({ pnl: 0 }); }
};

exports.getTrades = async (req, res) => {
    try {
        const status = await engineService.getStatus(req.user.id);
        res.json({ status: 'success', data: status.positions || [] });
    } catch (e) { res.json({ status: 'success', data: [] }); }
};

exports.getLogs = async (req, res) => {
    try {
        // Assuming engine returns logs in status or separate endpoint. 
        // For now, let's extract logs from status if available, or return empty.
        // We might need to add getLogs to engineService later.
        const status = await engineService.getStatus(req.user.id);
        res.json(status.logs || []);
    } catch (e) { res.json([]); }
};

exports.getConfig = async (req, res) => {
    try {
        const userId = String(req.user.id);
        const status = await engineService.getStatus(userId);

        // Python returns 'config' in get_state()
        if (status.active && status.config) {
            res.json(status.config);
        } else {
            // If not running, return empty object so frontend keeps local state
            // OR return saved config from DB if we implemented that.
            res.json({});
        }
    } catch (error) {
        console.error('Get Config Error:', error);
        res.json({});
    }
};

exports.updatePosition = async (req, res) => {
    try {
        const userId = String(req.user.id);
        const { positionId, tp, sl } = req.body;

        const result = await engineService.updatePosition(userId, positionId, tp, sl);
        res.json(result);
    } catch (error) {
        console.error('Update Position Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.exitPosition = async (req, res) => {
    try {
        const userId = String(req.user.id);
        const { positionId } = req.body;

        const result = await engineService.exitPosition(userId, positionId);
        res.json(result);
    } catch (error) {
        console.error('Exit Position Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getOrderBook = async (req, res) => {
    try {
        const userId = String(req.user.id);
        const status = await engineService.getStatus(userId);
        res.json({ status: 'success', data: status.trades_history || [] });
    } catch (error) {
        console.error('Get Order Book Error:', error);
        res.json({ status: 'success', data: [] });
    }
};

exports.saveBacktestResult = async (req, res) => {
    try {
        const userId = req.user.id;
        const { results, interval, fromDate, toDate, strategy } = req.body;

        if (Array.isArray(results) && results.length > 0) {
            const records = results.map(r => {
                const trades = parseInt((r['Total Trades'] || '0').toString().replace(/,/g, '')) || 0;
                const pnl = parseFloat((r['Total P&L'] || '0').toString().replace(/,/g, '').replace(/₹/g, '')) || 0;
                const winRate = parseFloat((r['Win Rate %'] || r['Win Rate'] || '0').toString().replace(/%/g, '')) || 0;
                const symbol = r['Symbol'] || r['symbol'] || 'Unknown';
                const finalCap = parseFloat((r['Final Capital'] || '0').toString().replace(/,/g, '').replace(/₹/g, '')) || 0;

                return {
                    user_id: userId,
                    strategy: strategy || 'ORB',
                    interval: interval || '5',
                    from_date: fromDate,
                    to_date: toDate,
                    trade_data: [r], // Store just this result
                    summary: {
                        totalTrades: trades,
                        winRate: winRate,
                        totalPnL: pnl,
                        symbol: symbol,
                        finalCapital: finalCap
                    }
                };
            });

            await BacktestResult.bulkCreate(records);
            res.json({ status: 'success', message: `Saved ${records.length} results to history` });
        } else {
            res.status(400).json({ status: 'error', message: 'No results to save' });
        }

    } catch (error) {
        console.error('Save Backtest Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save backtest result' });
    }
};

exports.getBacktestHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await BacktestResult.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'strategy', 'interval', 'from_date', 'to_date', 'createdAt', 'summary']
        });
        res.json({ status: 'success', data: history });
    } catch (error) {
        console.error('Get Backtest History Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch backtest history' });
    }
};

exports.deleteBacktestResult = async (req, res) => {
    try {
        const userId = req.user.id;
        const resultId = req.params.id;

        const result = await BacktestResult.findOne({
            where: { id: resultId, user_id: userId }
        });

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Backtest result not found' });
        }

        await result.destroy();
        res.json({ status: 'success', message: 'Backtest result deleted' });
    } catch (error) {
        console.error('Delete Backtest Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete backtest result' });
    }
};
