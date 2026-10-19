const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let connectionPromise = null;

// Re-uses a single connection (important for serverless platforms like Vercel)
async function connectDB(uri = env.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    if (!uri) throw new Error('MONGODB_URI is not configured');
    connectionPromise = mongoose
      .connect(uri, { dbName: env.dbName, serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        logger.info('MongoDB connected', { db: m.connection.name });
        return m.connection;
      })
      .catch((err) => {
        connectionPromise = null;
        logger.error('MongoDB connection error', { error: err.message });
        throw err;
      });
  }
  return connectionPromise;
}

function dbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, dbStatus };
