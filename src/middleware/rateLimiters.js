const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const logger = require('../utils/logger');

const handler = (req, res, next, options) => {
  logger.warn('Rate limit exceeded', { ip: req.ip, path: req.originalUrl });
  res.status(429).json({ status: false, message: options.message });
};

// Strict limiter for login / signup (brute-force protection)
const authLimiter = rateLimit({
  windowMs: env.authRateLimit.windowMs,
  limit: env.authRateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many authentication attempts. Please try again later.',
  handler,
});

// General limiter for all API traffic
const apiLimiter = rateLimit({
  windowMs: env.apiRateLimit.windowMs,
  limit: env.apiRateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
  handler,
});

module.exports = { authLimiter, apiLimiter };
