const axios = require('axios');
const { User } = require('../models');

// Placeholder for your Angel One Partner API Key
const ANGEL_API_KEY = process.env.ANGEL_API_KEY || 'MOCK_API_KEY'; 

exports.loginAngel = async (req, res) => {
    try {
        const userId = req.user.id;
        // In a real OAuth flow, we'd pass a state parameter to prevent CSRF and identify the user
        // For Angel One's Publisher Login:
        const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/broker/angel/callback?user_id=${userId}`);
        
        // Construct the Angel One login URL
        // If we are in local dev and don't have a real partner key, we redirect to a mock callback for testing
        if (ANGEL_API_KEY === 'MOCK_API_KEY') {
            console.log('Using mock Angel login flow...');
            return res.redirect(`/api/broker/angel/callback?user_id=${userId}&auth_token=mock_auth_token_12345`);
        }

        const angelLoginUrl = `https://smartapi.angelbroking.com/publisher-login?api_key=${ANGEL_API_KEY}`;
        res.redirect(angelLoginUrl);

    } catch (error) {
        console.error('Angel Login Error:', error);
        res.status(500).json({ message: 'Failed to initiate broker login' });
    }
};

exports.angelCallback = async (req, res) => {
    try {
        const { auth_token, user_id } = req.query;

        if (!auth_token || !user_id) {
            return res.status(400).send('Missing required parameters');
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Exchange auth_token for access_token
        let jwtToken = '';
        let refreshToken = '';

        if (auth_token === 'mock_auth_token_12345') {
            // Mock token generation for local testing
            jwtToken = 'mock_jwt_access_token_' + Date.now();
            refreshToken = 'mock_refresh_token_' + Date.now();
        } else {
            // Real Angel One token exchange
            const response = await axios.post('https://apiconnect.angelbroking.com/rest/auth/angelbroking/jwt/v1/generateTokens', {
                refreshToken: auth_token // Angel uses the auth_token as the refreshToken in this endpoint
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-PrivateKey': ANGEL_API_KEY
                }
            });

            if (response.data && response.data.status && response.data.data) {
                jwtToken = response.data.data.jwtToken;
                refreshToken = response.data.data.refreshToken;
            } else {
                return res.status(400).send('Failed to generate tokens from Angel One');
            }
        }

        // Save tokens to DB
        // In a production environment, you should encrypt these tokens before saving!
        await user.update({
            angel_access_token: jwtToken,
            angel_refresh_token: refreshToken,
            angel_token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // Assumes 24h validity
        });

        // Redirect back to the frontend dashboard API settings
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';
        res.redirect(`${frontendUrl}/dashboard/profile?broker_connected=success`);

    } catch (error) {
        console.error('Angel Callback Error:', error);
        res.status(500).send('Broker authentication failed');
    }
};
