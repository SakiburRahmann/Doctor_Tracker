/**
 * Environment variable validation.
 * Fails fast at boot so misconfiguration is caught before the server accepts traffic.
 */
const REQUIRED_ENV = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'CORS_ORIGIN'];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  // The .env.example placeholder is 43 chars, so it passes the length check.
  // Refuse it in production: a public, guessable signing key forges admin tokens.
  if (
    process.env.NODE_ENV === 'production' &&
    /change-me|placeholder|your-secret/i.test(process.env.JWT_SECRET)
  ) {
    throw new Error('JWT_SECRET is still a placeholder value. Generate a real secret.');
  }
  // Warn (don't fail) when running production with the CORS wildcard.
  if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN === '*') {
    console.warn('[warn] CORS_ORIGIN=* in production is not recommended; set an explicit origin.');
  }
}

module.exports = { validateEnv };
