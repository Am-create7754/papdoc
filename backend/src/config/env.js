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

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
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
};

module.exports = { validateEnv, env };
