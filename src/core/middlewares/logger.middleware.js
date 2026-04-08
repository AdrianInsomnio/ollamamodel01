const pinoHttp = require('pino-http');
const { logger } = require('../../lib/loger');

const httpLogger = pinoHttp({
  logger,
  customSuccessMessage: function (req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
});

module.exports = { httpLogger };