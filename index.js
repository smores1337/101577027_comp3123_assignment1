const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { connectDB } = require('./src/config/db');

if (!process.env.VERCEL) {
  connectDB()
    .catch(() => logger.error('Starting without a database connection'))
    .finally(() => {
      app.listen(env.port, () => logger.info(`Server started on port ${env.port}`, { env: env.nodeEnv }));
    });
}

process.on('unhandledRejection', (err) => logger.error('Unhandled rejection', { error: err && err.message }));

module.exports = app;
