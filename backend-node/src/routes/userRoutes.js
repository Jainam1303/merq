const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, userController.getProfile);
router.get('/plan-status', verifyToken, userController.getPlanStatus);
router.post('/update-profile', verifyToken, userController.updateProfile);

module.exports = router;
