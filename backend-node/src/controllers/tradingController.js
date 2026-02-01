const engineService = require('../services/engineService');
const { User, Subscription, Plan } = require('../models');

// Start Bot
exports.startBot = async (req, res) => {
    try {
        const userId = req.user.id;
        const { strategy_name, params } = req.body;

        // 1. Check Subscription/Plan Limits
        const sub = await Subscription.findOne({
            where: { user_id: userId, status: 'active' },
            include: [Plan]
        });

        if (!sub) {
            return res.status(403).json({ message: 'No active subscription found.' });
        }

        // 2. Prepare Config & Credentials
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const strategyConfig = {
            name: strategy_name || 'ORB',
            // In PROD: Validate 'params' against Plan Limits here
            params: params || {}
        };

        const brokerCreds = {
            angel_api_key: user.angel_api_key,
            angel_client_code: user.angel_client_code,
            angel_password: user.angel_password,
            angel_totp: user.angel_totp,

            backtest_api_key: user.backtest_api_key,
            backtest_client_code: user.backtest_client_code,
            backtest_password: user.backtest_password,
            backtest_totp: user.backtest_totp
        };

        // 3. Call Python Engine
        const result = await engineService.startSession(userId, strategyConfig, brokerCreds);

        res.json({ message: 'Bot started successfully', session_id: result.session_id });
    } catch (error) {
        console.error('Start Bot Error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to start bot' });
    }
};

// Stop Bot
exports.stopBot = async (req, res) => {
    try {
        const userId = req.user.id;
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
