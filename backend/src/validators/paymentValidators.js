const { z } = require('zod');

const objectId = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid consultation id');

const createOrderSchema = z.object({
  consultationId: objectId,
});

const verifyPaymentSchema = z.object({
  consultationId: objectId,
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

module.exports = { createOrderSchema, verifyPaymentSchema };
