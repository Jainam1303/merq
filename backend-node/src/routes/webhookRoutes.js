const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Internal endpoint - Protected by firewall/network rules in prod
router.post('/events', webhookController.handleEvent);

module.exports = router;
