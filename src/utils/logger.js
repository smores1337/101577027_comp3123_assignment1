const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('../config/env');

const transports = [];
const logDir = path.resolve(env.logDir);

try {
  fs.mkdirSync(logDir, { recursive: true });
  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' })
  );
} catch (e) {
  // If the filesystem is not writable we still log to the console
}

if (env.nodeEnv !== 'test') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports,
  silent: transports.length === 0,
});

module.exports = logger;
