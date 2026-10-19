require('dotenv').config({ quiet: true });

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME || 'comp3123_assignment1',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
  authRateLimit: {
    max: toInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
    windowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  },
  apiRateLimit: {
    max: toInt(process.env.API_RATE_LIMIT_MAX, 100),
    windowMs: toInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  },
  // Vercel's filesystem is read-only except /tmp
  logDir: process.env.LOG_DIR || (process.env.VERCEL ? '/tmp/logs' : 'logs'),
};

const missing = ['mongoUri', 'jwtSecret'].filter((k) => !env[k]);
if (missing.length && env.nodeEnv !== 'test') {
  // Do not print values, only names of missing variables
  console.error(`Missing required environment variables: ${missing.map((k) => (k === 'mongoUri' ? 'MONGODB_URI' : 'JWT_SECRET')).join(', ')}`);
}

module.exports = env;
