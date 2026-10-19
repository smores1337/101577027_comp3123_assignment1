// Uses TEST_MONGODB_URI if provided, otherwise spins up an in-memory MongoDB.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.DB_NAME = 'comp3123_assignment1_test';
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '1000';
process.env.LOG_DIR = 'logs/test';

const mongoose = require('mongoose');

let memoryServer;

async function startDB() {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  const { connectDB } = require('../src/config/db');
  await connectDB(uri);
  await mongoose.connection.db.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function stopDB() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { startDB, stopDB };
