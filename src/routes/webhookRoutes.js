const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook endpoint: POST /api/webhook/payment
router.post('/payment', webhookController.handlePaymentWebhook);

module.exports = router;
