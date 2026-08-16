const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

router.post('/razorpay', webhookController.handleRazorpayWebhook);
router.get('/whatsapp', webhookController.verifyWhatsappWebhook);
router.post('/whatsapp', webhookController.handleWhatsappWebhook);

module.exports = router;
