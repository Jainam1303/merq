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

        // Get user credentials from database
        const userQuery = 'SELECT angel_api_key, angel_client_code, angel_password, angel_totp FROM users WHERE id = $1';
        const userResult = await req.app.locals.pool.query(userQuery, [userId]);

        if (!userResult.rows.length) {
            return res.status(404).json({ success: false, message: 'User credentials not found' });
        }

        const credentials = userResult.rows[0];

        // Forward request to Python engine for execution
        const pythonResponse = await axios.post('http://localhost:5002/execute_test_order', {
            symbol,
            qty,
            orderType,
            price,
            tp,
            sl,
            credentials: {
                apiKey: credentials.angel_api_key,
                clientCode: credentials.angel_client_code,
                password: credentials.angel_password,
                totp: credentials.angel_totp
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
