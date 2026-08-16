const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { createOrderSchema, verifyPaymentSchema } = require('../validators/paymentValidators');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post(
  '/create-order',
  authenticate,
  authorize('patient'),
  validate(createOrderSchema),
  paymentController.createOrder
);
router.post(
  '/verify',
  authenticate,
  authorize('patient'),
  validate(verifyPaymentSchema),
  paymentController.verify
);

module.exports = router;
