const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Runs after express-validator chains and turns failures into a 400 response
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  logger.warn('Validation failed', { method: req.method, path: req.originalUrl, fields: errors.map((e) => e.field) });
  return next(ApiError.badRequest('Validation failed', errors));
}

module.exports = validate;
