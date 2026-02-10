const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// User-facing referral endpoints
router.get('/stats', referralController.getStats);
router.get('/earnings', referralController.getEarnings);
router.get('/referrals', referralController.getReferrals);
router.post('/generate-code', referralController.generateCode);

module.exports = router;
