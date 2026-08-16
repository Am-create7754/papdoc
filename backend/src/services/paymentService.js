const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const razorpay = require('../config/razorpay');
const { env } = require('../config/env');
const { verifyHmacSignature } = require('../utils/verifySignature');
const whatsappService = require('./whatsappService');

async function notifyDoctorSafely(consultation) {
  try {
    await whatsappService.sendConsultationToDoctor(consultation);
  } catch (err) {
    console.error('WhatsApp notification failed for consultation:', consultation._id.toString(), err.message);
  }
}

const CURRENCY = 'INR';

function feeForType(doctor, consultationType) {
  const fee = consultationType === 'priority' ? doctor.priorityConsultationFee : doctor.consultationFee;
  if (fee == null || typeof fee !== 'number' || !Number.isFinite(fee) || fee <= 0) {
    return null;
  }
  return fee;
}

async function createOrder(patient, consultationId) {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation || consultation.patientId.toString() !== patient._id.toString()) {
    throw new ApiError(404, 'Consultation not found');
  }

  if (consultation.status === 'cancelled') {
    throw new ApiError(400, 'This consultation cannot be paid for');
  }
  if (consultation.paymentStatus === 'paid') {
    throw new ApiError(409, 'This consultation has already been paid');
  }

  const doctor = await Doctor.findById(consultation.doctorId);
  if (!doctor) {
    throw new ApiError(503, 'Doctor is currently unavailable');
  }

  const fee = feeForType(doctor, consultation.consultationType);
  if (fee === null) {
    throw new ApiError(422, 'Consultation fee is not configured. Please contact support.');
  }

  const amountInPaise = Math.round(fee * 100);

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: CURRENCY,
      receipt: consultation._id.toString(),
      notes: {
        consultationId: consultation._id.toString(),
        patientId: patient._id.toString(),
        consultationType: consultation.consultationType,
      },
    });
  } catch (err) {
    throw new ApiError(502, 'Failed to create payment order. Please try again.');
  }

  consultation.razorpayOrderId = order.id;
  consultation.paymentAmount = fee;
  consultation.paymentCurrency = CURRENCY;
  consultation.paymentStatus = 'pending';
  await consultation.save();

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency: CURRENCY,
    keyId: env.razorpayKeyId,
    consultationId: consultation._id,
    consultationType: consultation.consultationType,
    fee,
  };
}

async function verifyPayment(patient, payload) {
  const { consultationId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } =
    payload;

  const consultation = await Consultation.findById(consultationId);
  if (!consultation || consultation.patientId.toString() !== patient._id.toString()) {
    throw new ApiError(404, 'Consultation not found');
  }

  if (consultation.paymentStatus === 'paid') {
    if (consultation.razorpayPaymentId === paymentId) {
      return {
        consultationId: consultation._id,
        paymentStatus: consultation.paymentStatus,
        paidAt: consultation.paidAt,
        amount: consultation.paymentAmount,
      };
    }
    throw new ApiError(409, 'This consultation has already been paid');
  }

  if (!consultation.razorpayOrderId || consultation.razorpayOrderId !== orderId) {
    throw new ApiError(400, 'Payment order does not match this consultation');
  }

  const isValid = verifyHmacSignature(`${orderId}|${paymentId}`, signature, env.razorpayKeySecret);
  if (!isValid) {
    throw new ApiError(400, 'Payment verification failed');
  }

  consultation.paymentStatus = 'paid';
  consultation.razorpayPaymentId = paymentId;
  consultation.paidAt = new Date();
  await consultation.save();

  await notifyDoctorSafely(consultation);

  return {
    consultationId: consultation._id,
    paymentStatus: consultation.paymentStatus,
    paidAt: consultation.paidAt,
    amount: consultation.paymentAmount,
  };
}

async function reconcileFromWebhook(orderId, paymentId) {
  if (!orderId || !paymentId) return;

  const consultation = await Consultation.findOne({ razorpayOrderId: orderId });
  if (!consultation || consultation.paymentStatus === 'paid') return;

  consultation.paymentStatus = 'paid';
  consultation.razorpayPaymentId = paymentId;
  consultation.paidAt = new Date();
  try {
    await consultation.save();
  } catch (err) {
    // Duplicate delivery or race with /verify — safe to ignore, state is already reconciled.
    console.warn('Webhook reconciliation skipped:', err.message);
    return;
  }

  await notifyDoctorSafely(consultation);
}

module.exports = { createOrder, verifyPayment, reconcileFromWebhook };
