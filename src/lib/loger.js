const pino = require('pino');
const { env } = require('../config/env');

const logger = pino({
  level: env.logLevel,
  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          level: 'debug',
          options: { colorize: true },
        }
      : undefined,
});

module.exports = { logger };