require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { validateEnv, env } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');
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

  app.use(helmet());
  // In production this behaves exactly as before: only env.clientOrigin is allowed. In
  // development it additionally accepts any http://localhost:<port> origin, since Vite's
  // dev server silently shifts ports (5173 -> 5174 -> ...) whenever something else on the
  // machine already holds the configured port — a single hardcoded dev origin breaks CORS
  // (and therefore login) every time that happens.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === env.clientOrigin) return callback(null, true);
        if (env.nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
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

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/doctor', doctorRoutes);
  app.use('/api/patient', patientRoutes);
  app.use('/api/consultations', consultationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/video', videoRoutes);

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`Healthify API running on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
