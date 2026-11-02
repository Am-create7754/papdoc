const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function limiter(max, message, windowMs = FIFTEEN_MINUTES) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });
}

// Baseline for every /api route. Webhooks are excluded in server.js: Razorpay and Meta deliver
// from a handful of shared IPs and are already authenticated by their HMAC signatures.
const apiLimiter = limiter(600, 'Too many requests. Please slow down and try again shortly.');

// Login/register/Google sign-in — tight, to blunt password guessing and signup spam.
const authLimiter = limiter(20, 'Too many login attempts. Please try again in 15 minutes.');

// Called on every page load and token expiry, so looser than login but still bounded.
const refreshLimiter = limiter(120, 'Too many session refreshes. Please try again shortly.');

// Creating a consultation writes uploads to disk and may trigger WhatsApp alerts.
const consultationCreateLimiter = limiter(15, 'Too many consultations submitted. Please try again later.', 60 * 60 * 1000);

// The live input pre-check runs as the patient types, so it allows a steady trickle.
const precheckLimiter = limiter(120, 'Too many requests. Please slow down and try again shortly.');

// Order creation and verification each call out to Razorpay.
const paymentLimiter = limiter(40, 'Too many payment attempts. Please try again in a few minutes.');

// Issuing a video token can create a Daily room (counts toward the plan's usage).
const videoTokenLimiter = limiter(40, 'Too many video join attempts. Please try again in a few minutes.');

// Doctor-only signature uploads and manual replies.
const doctorWriteLimiter = limiter(60, 'Too many requests. Please try again shortly.');

module.exports = {
  apiLimiter,
  authLimiter,
  refreshLimiter,
  consultationCreateLimiter,
  precheckLimiter,
  paymentLimiter,
  videoTokenLimiter,
  doctorWriteLimiter,
};
