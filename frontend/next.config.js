/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The standalone Express API is a separate deployment; the frontend talks to it over REST.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
