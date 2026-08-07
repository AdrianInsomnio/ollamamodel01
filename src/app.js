require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { errorMiddleware } = require('./core/middlewares/error.middleware');
const routes = require('./routes');
const { httpLogger } = require('./core/middlewares/logger.middleware');
const { logger } = require('./lib/loger');

const app = express();

// Security middleware
app.use(helmet());
const corsOptions = {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? "https://yourdomain.com" : "http://localhost:3000"),
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
// app.use(httpLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api', limiter);

// Auth rate limiting (more strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for auth endpoints
  message: { error: 'Too many authentication attempts, please try again later' }
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/health', (req, res) => {
  logger.info('Health check endpoint hit');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
routes(app);

// Error handler
app.use(errorMiddleware);

module.exports = app;
