/**
 * HTTP listener. Connection lifecycle:
 *   connect DB -> start Express -> graceful shutdown on SIGTERM/SIGINT.
 */
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;

let server;

(async () => {
  try {
    await connectDB();
    const app = createApp();
    server = app.listen(PORT, () => {
      console.log(`[server] Doctor Tracker API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
})();

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force-exit if close() hangs (in-flight requests).
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
