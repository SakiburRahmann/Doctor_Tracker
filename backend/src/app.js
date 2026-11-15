/**
 * Express app assembly (exported separately from the listener for easy testing).
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { validateEnv } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const doctorRoutes = require('./routes/doctor.routes');
const patientRoutes = require('./routes/patient.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  validateEnv();

  const app = express();

  app.set('trust proxy', 1); // correct client IPs behind Render/Vercel proxies

  // origins allowed to call the API (comma-separated list in CORS_ORIGIN)
  const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  // Wildcard only outside production — never open a deployed API to every origin.
  const allowAnyOrigin =
    process.env.NODE_ENV !== 'production' && allowedOrigins.includes('*');

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin/no-origin requests (curl, server-to-server, health checks).
        if (!origin || allowAnyOrigin || allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        // 403 rather than a generic 500: the request was refused by policy.
        const err = new Error('CORS blocked for this origin');
        err.status = 403;
        return cb(err);
      },
      credentials: false,
      // Chrome only caches a preflight for 5s by default, which means an extra
      // OPTIONS round trip before almost every authenticated request. 10 minutes
      // removes that from the critical path.
      maxAge: 600,
    })
  );

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '100kb' })); // hard cap on body size

  // Request log (kept tiny; morgan-free to avoid an extra dependency).
  if (process.env.NODE_ENV !== 'test') {
    app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Doctor Tracker API is healthy.', uptime: process.uptime() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
