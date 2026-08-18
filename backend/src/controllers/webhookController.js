const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyHmacSignature } = require('../utils/verifySignature');
const paymentService = require('../services/paymentService');
const whatsappService = require('../services/whatsappService');
const { env } = require('../config/env');

const PAID_EVENTS = ['payment.captured', 'order.paid'];

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  if (!env.razorpayWebhookSecret) {
    throw new ApiError(503, 'Webhook is not configured');
  }

  const signature = req.headers['x-razorpay-signature'];
  const isValid = verifyHmacSignature(req.rawBody, signature, env.razorpayWebhookSecret);
  if (!isValid) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const event = req.body;

  if (PAID_EVENTS.includes(event.event)) {
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    await paymentService.reconcileFromWebhook(orderId, paymentId);
  }

  res.status(200).json({ success: true });
});

const verifyWhatsappWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && env.metaWebhookVerifyToken && token === env.metaWebhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
};

const handleWhatsappWebhook = asyncHandler(async (req, res) => {
  if (!env.metaAppSecret) {
    // Not configured yet — ack to avoid Meta retry storms.
    return res.status(200).json({ success: true });
  }

  const header = req.headers['x-hub-signature-256'];
  const signature = header?.startsWith('sha256=') ? header.slice(7) : header;
  if (!verifyHmacSignature(req.rawBody, signature, env.metaAppSecret)) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        for (const s of value.statuses || []) {
          await whatsappService.processDeliveryStatus({
            wamid: s.id,
            status: s.status,
            timestamp: s.timestamp,
            errorCode: s.errors?.[0]?.code,
            errorMessage: s.errors?.[0]?.title,
          });
        }

        for (const msg of value.messages || []) {
          if (msg.type !== 'text') continue; // ignore non-text for this phase
          await whatsappService.processDoctorReply({
            from: msg.from,
            messageId: msg.id,
            text: msg.text?.body,
            contextId: msg.context?.id,
          });
        }
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err.message);
  }

  res.status(200).json({ success: true });
});

module.exports = { handleRazorpayWebhook, verifyWhatsappWebhook, handleWhatsappWebhook };
