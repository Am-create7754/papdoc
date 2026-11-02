const REQUIRED_VARS = [
  'PORT',
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'CLIENT_ORIGIN',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];

const path = require('path');

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PATTERN = /changeme|placeholder|your[_-]?secret|^secret$/i;

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Anyone who knows (or guesses) a JWT secret can mint a login token for any account, so weak or
  // copied-from-.env.example secrets are refused outright in production and flagged in development.
  const weakSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((key) => {
    const value = process.env[key];
    return value.length < MIN_SECRET_LENGTH || PLACEHOLDER_PATTERN.test(value);
  });
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    weakSecrets.push('JWT_ACCESS_SECRET/JWT_REFRESH_SECRET (must differ)');
  }
  if (weakSecrets.length > 0) {
    const message = `Weak JWT secrets (need ${MIN_SECRET_LENGTH}+ random characters): ${weakSecrets.join(', ')}`;
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    console.warn(`WARNING: ${message}`);
  }

  if (process.env.NODE_ENV === 'production') {
    if (/^rzp_test_/.test(process.env.RAZORPAY_KEY_ID)) {
      console.warn('WARNING: Razorpay is using TEST keys in production — no real payments will be collected.');
    }
    if (!/^https:\/\//.test(process.env.CLIENT_ORIGIN)) {
      console.warn('WARNING: CLIENT_ORIGIN is not https — refresh cookies are marked Secure in production.');
    }
  }
}

const env = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  clientOrigin: process.env.CLIENT_ORIGIN,
  // Where photos, prescription PDFs and signatures are stored. In production point this at a
  // persistent volume (e.g. /data/uploads on Railway) so files survive redeploys.
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads'),
  // Number of reverse proxies (nginx, Render, Railway, etc.) in front of the API. Needed so rate
  // limits key on the real client IP instead of the proxy's; leave unset when running directly.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // Base URL used to build doctor-facing WhatsApp CTA links. Falls back to CLIENT_ORIGIN (the
  // same SPA origin already configured for CORS) so no new config is required in environments
  // that haven't set it explicitly; set APP_PUBLIC_URL separately only if the public link the
  // doctor should tap ever needs to differ from the CORS-allowed origin.
  appPublicUrl: process.env.APP_PUBLIC_URL || process.env.CLIENT_ORIGIN,
  // OAuth client ID from Google Cloud Console; Google sign-in is disabled while it's unset.
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  metaWhatsappAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN,
  metaWhatsappPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
  metaWhatsappBusinessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
  metaAppSecret: process.env.META_APP_SECRET,
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
  metaGraphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
  doctorWhatsappNumber: process.env.DOCTOR_WHATSAPP_NUMBER,
  metaWhatsappTemplateName: process.env.META_WHATSAPP_CONSULTATION_TEMPLATE || 'new_consultation_alert',
  metaWhatsappTemplateLanguage: process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  // Turn on only after the consultation templates in Meta have an IMAGE header: the alert then
  // carries the patient's first attached photo, or a default "No photo attached" image.
  metaWhatsappImageHeader: process.env.META_WHATSAPP_IMAGE_HEADER === 'true',
  // Separate operational-alert templates — never reused for the prescription-reply-correlated
  // flow above, and never mutated by it.
  metaWhatsappVideoAlertTemplateName: process.env.META_WHATSAPP_VIDEO_ALERT_TEMPLATE || 'video_consultation_alert',
  metaWhatsappPriorityAlertTemplateName:
    process.env.META_WHATSAPP_PRIORITY_ALERT_TEMPLATE || 'priority_consultation_alert',

  // Daily (daily.co) video calls — API key from dashboard.daily.co → Developers.
  dailyApiKey: process.env.DAILY_API_KEY,

  videoMaxDailyConsultations: Number(process.env.VIDEO_MAX_DAILY_CONSULTATIONS) || 10,
  videoDefaultSessionMinutes: Number(process.env.VIDEO_DEFAULT_SESSION_MINUTES) || 10,
  videoDoctorJoinGraceMinutes: Number(process.env.VIDEO_DOCTOR_JOIN_GRACE_MINUTES) || 3,
  videoPatientJoinTimeoutMinutes: Number(process.env.VIDEO_PATIENT_JOIN_TIMEOUT_MINUTES) || 5,
};

module.exports = { validateEnv, env };
