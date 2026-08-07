// El modulo logger.middleware es opcional. Si pino falla al cargar (caso de
// tests con stubs), usamos un no-op para no romper el require chain.
let httpLogger;
try {
  const pinoHttp = require('pino-http');
  const { logger } = require('../../lib/loger');
  httpLogger = pinoHttp({
    logger,
    customSuccessMessage: function (req, res) {
      return req.method + ' ' + req.url + ' ' + res.statusCode;
    },
  });
} catch (_err) {
  // Fallback silencioso para que el wiring de middlewares no rompa tests.
  httpLogger = (req, res, next) => next();
}

module.exports = { httpLogger };