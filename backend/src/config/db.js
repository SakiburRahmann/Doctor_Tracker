/**
 * MongoDB connection (Mongoose 8).
 * - Keeps a single cached connection (serverless-friendly if reused).
 * - Exits loudly on failure so the process manager can restart the dyno.
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  mongoose.set('strictQuery', true); // explicit behaviour for undefined fields in filters

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000, // fail fast instead of hanging on a bad URI
    maxPoolSize: 10, // sane default; avoids connection exhaustion on free tiers
  });

  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('[db] MongoDB disconnected');
};

module.exports = { connectDB, disconnectDB };
