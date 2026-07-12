const express = require('express');
const router = express.Router();
const brokerAuthController = require('../controllers/brokerAuthController');
const { verifyToken } = require('../middleware/authMiddleware');

// Route to initiate Angel One Login (protected to get user_id)
router.get('/angel/login', verifyToken, brokerAuthController.loginAngel);

// Callback route where Angel One redirects to (unprotected, as Angel One calls it directly)
router.get('/angel/callback', brokerAuthController.angelCallback);

module.exports = router;
