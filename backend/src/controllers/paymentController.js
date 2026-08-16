const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');

const createOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createOrder(req.user, req.body.consultationId);
  res.status(200).json({ success: true, data: result });
});

const verify = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(req.user, req.body);
  res.status(200).json({ success: true, data: result });
});

module.exports = { createOrder, verify };
