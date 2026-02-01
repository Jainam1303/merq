const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/tradingController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/start', verifyToken, tradingController.startBot);
router.post('/stop', verifyToken, tradingController.stopBot);
router.get('/status', verifyToken, tradingController.getStatus);

module.exports = router;
