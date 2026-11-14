/**
 * Vercel serverless entry point.
 *
 * Mounts the existing Express app (backend/src/app.js) as a single serverless
 * function so the whole Doctor_Tracker repo deploys as one Vercel project:
 *   /api/*  -> this function (Express API)
 *   /*      -> frontend (Next.js, via vercel.json)
 *
 * The Express app reads MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN and CORS_ORIGIN
 * from the Vercel project's environment variables. Mongoose connects lazily via
 * connectDB() on first use (cached by Mongoose's default connection pooling).
 */
const { connectDB } = require('../backend/src/config/db');
const { createApp } = require('../backend/src/app');

// Fail fast on missing config — same behaviour as the long-running server.
process.env.PORT = process.env.PORT || 5000;
if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = '1d';

// Connect once per warm lambda instance (no-op if already connected).
connectDB().catch((err) => {
  console.error('[vercel] MongoDB connection failed:', err.message);
});

module.exports = async (req, res) => {
  const app = createApp();
  return app(req, res);
};
