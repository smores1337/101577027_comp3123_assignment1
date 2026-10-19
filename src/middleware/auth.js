const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { verifyToken } = require('../services/tokenService');
const User = require('../models/User');

// Verifies "Authorization: Bearer <jwt>" and attaches req.user (identity comes ONLY from the token)
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!header) {
    logger.warn('Auth failed: missing token', { path: req.originalUrl, ip: req.ip });
    return next(ApiError.unauthorized('Access denied. No token provided'));
  }
  if (scheme !== 'Bearer' || !token) {
    logger.warn('Auth failed: malformed Authorization header', { path: req.originalUrl, ip: req.ip });
    return next(ApiError.unauthorized('Invalid Authorization header. Expected: Bearer <token>'));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    logger.warn(`Auth failed: ${expired ? 'expired' : 'invalid'} token`, { path: req.originalUrl, ip: req.ip });
    return next(ApiError.unauthorized(expired ? 'Token has expired' : 'Invalid token'));
  }

  if (!payload.sub || !mongoose.isValidObjectId(payload.sub)) {
    return next(ApiError.unauthorized('Invalid token'));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    logger.warn('Auth failed: token user no longer exists', { userId: payload.sub });
    return next(ApiError.unauthorized('User for this token no longer exists'));
  }

  req.user = { id: user._id.toString(), username: user.username };
  return next();
}

module.exports = authenticate;
