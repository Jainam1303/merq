const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/tradingController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/start', verifyToken, tradingController.startBot);
router.post('/stop', verifyToken, tradingController.stopBot);
router.get('/status', verifyToken, tradingController.getStatus);
router.get('/config', verifyToken, tradingController.getConfig);
router.post('/update-position', verifyToken, tradingController.updatePosition);
router.post('/exit-position', verifyToken, tradingController.exitPosition);
router.post('/dismiss-position', verifyToken, tradingController.dismissPosition);
router.get('/order-book', verifyToken, tradingController.getOrderBook);

module.exports = router;
