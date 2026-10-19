const logger = require('../utils/logger');

// Logs timestamp (added by logger), method, path, status and duration. Never logs bodies or headers.
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const meta = {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    };
    if (req.user) meta.userId = req.user.id;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'HTTP request', meta);
  });
  next();
}

module.exports = requestLogger;
