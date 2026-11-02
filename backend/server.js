const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { validateEnv, env } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');
const { apiLimiter } = require('./src/middlewares/rateLimiters');
const healthRoutes = require('./src/routes/healthRoutes');
const authRoutes = require('./src/routes/authRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const consultationRoutes = require('./src/routes/consultationRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const videoRoutes = require('./src/routes/videoRoutes');

async function start() {
  validateEnv();
  await connectDB();

  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);

  // Content-Security-Policy is left off: the SPA loads Google Sign-In, Razorpay Checkout, Google
  // Fonts/Maps and Daily video from their own origins. Popups (Google, Razorpay) need
  // same-origin-allow-popups to talk back to the page.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginEmbedderPolicy: false,
    })
  );
  // In production this behaves exactly as before: only env.clientOrigin is allowed. In
  // development it additionally accepts any http://localhost:<port> origin, since Vite's
  // dev server silently shifts ports (5173 -> 5174 -> ...) whenever something else on the
  // machine already holds the configured port — a single hardcoded dev origin breaks CORS
  // (and therefore login) every time that happens. Development also accepts ngrok test URLs, so
  // the app can be opened on a real phone (and reached by Meta's webhook) through a tunnel.
  const DEV_ORIGIN = /^(http:\/\/(([a-z0-9-]+\.)?localhost|127\.0\.0\.1):\d+|https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(app|dev))$/;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === env.clientOrigin) return callback(null, true);
        if (env.nodeEnv !== 'production' && DEV_ORIGIN.test(origin)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );
  app.use(
    express.json({
      limit: '10kb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.use('/api', (req, res, next) => (req.path.startsWith('/webhooks') ? next() : apiLimiter(req, res, next)));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/doctor', doctorRoutes);
  app.use('/api/patient', patientRoutes);
  app.use('/api/consultations', consultationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/video', videoRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Production: this same server also serves the built React app, so the site and its API share
  // one origin (no CORS, and the login cookie just works). Unknown paths fall back to index.html
  // for client-side routing.
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (env.nodeEnv === 'production' && fs.existsSync(path.join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
  }

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`Healthify API running on port ${env.port}`);
  });
}

// Log and keep serving on a stray rejected promise (e.g. a fire-and-forget WhatsApp call) rather
// than letting it go unnoticed.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
