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

async function start() {
  validateEnv();
  await connectDB();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
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
