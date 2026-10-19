const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl.split('?')[0]} not found`));
}

// Centralized JSON error handler. Never exposes stack traces, secrets or passwords.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message;
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : undefined;

  if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    status = 413; message = 'Request body too large';
  } else if (err.name === 'ValidationError') {
    status = 400; message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400; message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  } else if (!(err instanceof ApiError) && status === 500) {
    message = 'Internal server error';
  }

  if (status >= 500) {
    logger.error('Unhandled error', { method: req.method, path: req.originalUrl, error: err.message, stack: err.stack });
  }

  const body = { status: false, message };
  if (errors) body.errors = errors;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
