/**
 * Vercel entry point (zero-configuration Express pattern + graceful DB gating).
 *
 * Vercel detects the exported Express app and bundles it into a single
 * serverless function; Express's router receives the original request path
 * unchanged, so /api/auth, /api/doctors, /api/patients and /api/analytics
 * routes work as-is.
 *
 * Database gating: the deployment is live before an Atlas cluster exists.
 * - No MONGODB_URI  -> /api/health still answers (DB "disconnected"),
 *   everything else returns 503 with instructions.
 * - With a URI      -> mongoose connects lazily (cached per warm instance).
 *
 * Environment variables (set in the Vercel project):
 *   MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN, NODE_ENV, PORT
 */
require('dotenv').config();

const express = require('express');
const { connectDB } = require('./src/config/db');
const { createApp } = require('./src/app');

const HAS_DB_URI = Boolean(process.env.MONGODB_URI);

// Satisfy env validation defaults so a single missing var cannot 500 every request.
if (!process.env.PORT) process.env.PORT = '5000';
if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = '1d';

let appPromise = null;

function buildApp() {
  if (!appPromise) {
    appPromise = (async () => {
      // CORS first in both modes so browsers can read every response (incl. 503s).
      const cors = require('cors');
      const allowedOrigins = (process.env.CORS_ORIGIN || '')
        .split(',').map((o) => o.trim()).filter(Boolean);
      // Wildcard only outside production — never open a deployed API to every origin.
      const allowAnyOrigin =
        process.env.NODE_ENV !== 'production' && allowedOrigins.includes('*');

      const corsMiddleware = cors({
        origin: (origin, cb) => {
          // Allow same-origin/no-origin requests (curl, health checks).
          if (!origin || allowAnyOrigin || allowedOrigins.includes(origin)) {
            return cb(null, true);
          }
          const err = new Error('CORS blocked for this origin');
          err.status = 403;
          return cb(err);
        },
        credentials: false,
      });

      if (!HAS_DB_URI) {
        // Minimal app: health works, API routes explain the missing database.
        const app = express();
        app.use(corsMiddleware);
        app.get('/api/health', (_req, res) => {
          res.json({
            success: true,
            message: 'Doctor Tracker API is healthy.',
            database: 'not configured — set MONGODB_URI to a MongoDB Atlas connection string',
          });
        });
        app.use('/api', (_req, res) => {
          res.status(503).json({
            success: false,
            message: 'Database not configured. Set MONGODB_URI (MongoDB Atlas SRV string) in the Vercel project environment variables, then redeploy.',
          });
        });
        return app;
      }

      // Full app: connect once per warm instance (mongoose.connect is idempotent).
      await connectDB();
      const app = createApp();
      return app;
    })().catch((err) => {
      appPromise = null; // allow retry on the next invocation
      console.error('[vercel] boot failed:', err.message);
      // Re-throw as a rejected promise the handler turns into a 503.
      throw err;
    });
  }
  return appPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await buildApp();
    return app(req, res);
  } catch (err) {
    // Log the detail server-side; never echo internals (URIs, hostnames) to clients.
    console.error('[vercel] handler failed:', err);
    res.status(503).json({
      success: false,
      message: 'API failed to start. Check the deployment logs and environment variables.',
    });
    return undefined;
  }
};
