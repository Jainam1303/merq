const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Test Order Execution Endpoint
 * Directly calls Angel Smart API to place a test order
 * Bypasses all strategy logic for diagnostic purposes
 */
router.post('/test_order', async (req, res) => {
    try {
        const { symbol, qty, orderType, price, tp, sl } = req.body;

        // Get userId from authenticated user (set by verifyToken middleware)
        const userId = req.user.id;

        // Get user credentials from database using Sequelize
        const { User } = require('../models');
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Validate API credentials exist
        if (!user.angel_api_key || !user.angel_client_code || !user.angel_password || !user.angel_totp) {
            return res.status(400).json({
                success: false,
                message: 'Angel One API credentials are missing. Please configure them in Settings > API Keys.'
            });
        }

        // Forward request to Python engine (existing service on port 5002)
        const pythonResponse = await axios.post('http://localhost:5002/engine/test_order', {
            symbol,
            qty,
            orderType,
            price,
            tp,
            sl,
            credentials: {
                apiKey: user.angel_api_key,
                clientCode: user.angel_client_code,
                password: user.angel_password,
                totp: user.angel_totp
            }
        }, { timeout: 30000 });

        return res.json({
            success: true,
            data: pythonResponse.data
        });

    } catch (error) {
        console.error('Test order error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
});

module.exports = router;
