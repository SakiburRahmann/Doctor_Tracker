/**
 * Vercel entry point (zero-configuration Express pattern).
 *
 * When the backend folder is deployed as a Vercel project, Vercel detects the
 * exported Express app and bundles it into a single serverless function.
 * Express's router receives the original request path unchanged, so the
 * /api/auth, /api/doctors, /api/patients and /api/analytics routes work as-is.
 *
 * Mongoose connects lazily and is cached by the driver's connection pool, so
 * warm lambda instances reuse a single connection set.
 *
 * Environment variables (set in the Vercel project):
 *   MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN, NODE_ENV, PORT
 */
require('dotenv').config();

const { connectDB } = require('./src/config/db');
const { createApp } = require('./src/app');

// Vercel serverless functions do not pass PORT; give env validation a value
// and default the token lifetime so a missing var cannot 500 every request.
if (!process.env.PORT) process.env.PORT = '5000';
if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = '1d';

// Connect once per warm instance (mongoose.connect is idempotent).
connectDB().catch((err) => {
  console.error('[vercel] MongoDB connection failed:', err.message);
});

module.exports = createApp();
