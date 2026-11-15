/** @type {import('next').NextConfig} */

/**
 * The browser talks to `/api/*` on its own origin; Vercel's edge proxies those
 * requests to the Express deployment. Same-origin means:
 *   - no second DNS lookup / TCP / TLS handshake for an api.* host,
 *   - no CORS preflight (an Authorization header used to force an OPTIONS
 *     round trip before almost every request),
 *   - one warm connection reused by every call on the page.
 * The Express app is untouched and still answers cross-origin callers.
 */
const apiTarget =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://doctor-tracker-api-gamma.vercel.app'
    : 'http://localhost:5000');

const nextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework version in responses.
  poweredByHeader: false,
  env: {
    // Kept for anything that still needs an absolute URL (scripts, diagnostics).
    NEXT_PUBLIC_API_URL: apiTarget,
  },

  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }];
  },

  // Baseline browser hardening. The API already sends Helmet headers; these
  // cover the HTML origin that actually serves the admin UI.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
