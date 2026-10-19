const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { connectDB, dbStatus } = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

const app = express();

app.set('trust proxy', 1); // correct client IPs behind Vercel / proxies (used by the rate limiter)
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    status: true,
    message: 'COMP3123 Assignment 1 - Employee Management API',
    endpoints: {
      health: 'GET /health',
      signup: 'POST /api/v1/user/signup',
      login: 'POST /api/v1/user/login',
      employees: 'GET|POST /api/v1/emp/employees',
      employee: 'GET|PUT /api/v1/emp/employees/{eid}',
      deleteEmployee: 'DELETE /api/v1/emp/employees?eid=xxx',
    },
  });
});

app.get('/health', async (req, res) => {
  try { await connectDB(); } catch (e) { /* reported below */ }
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected',
    message: db === 'connected' ? 'API is healthy' : 'API is up but the database is unavailable',
    database: db,
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Make sure the DB is connected before handling API requests (needed for serverless cold starts)
app.use('/api', async (req, res, next) => {
  try { await connectDB(); next(); } catch (e) { next(Object.assign(new Error('Database unavailable'), { statusCode: 503 })); }
});

app.use('/api', apiLimiter);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/emp', employeeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
