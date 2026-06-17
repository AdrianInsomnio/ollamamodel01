const { AppError } = require('../errors/AppError');
const idempotencyService = require('./idempotency.service');

/**
 * Middleware de idempotencia.
 *
 * Si el cliente manda el header Idempotency-Key:
 *   1. Buscamos respuesta cacheada para (key, endpointName).
 *   2. Si hay hit -> respondemos con la misma respuesta guardada, sin
 *      ejecutar el handler. Marcamos el header `X-Idempotency-Replay: true`.
 *   3. Si no hay hit -> dejamos pasar al handler. Cuando res.json es
 *      llamado, persistimos (async, best-effort) la respuesta canonica
 *      para futuros replays.
 *
 * Si el cliente NO manda la key, el middleware es no-op.
 *
 * Notas:
 *  - res.locals.idempotency queda disponible para observabilidad.
 *  - res.locals.idempotency.savePromise se setea cuando res.json se
 *    ejecuta, para que tests/callers puedan await la persistencia.
 */
const idempotency = (endpointName) => {
  if (!endpointName || typeof endpointName !== 'string') {
    throw new Error('idempotency(endpointName) requiere un nombre de endpoint');
  }

  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];

    if (!key) {
      return next();
    }

    if (typeof key !== 'string' || key.length < 8 || key.length > 200) {
      return next(new AppError('Idempotency-Key invalido (8-200 chars)', 400, 'INVALID_IDEMPOTENCY_KEY'));
    }

    try {
      const replay = await idempotencyService.findReplay(key, endpointName);

      if (replay.hit) {
        res.setHeader('X-Idempotency-Replay', 'true');
        res.setHeader('X-Idempotency-Endpoint', endpointName);
        return res.status(replay.statusCode).json(replay.response);
      }

      // No hay replay: enganchamos res.json para persistir al final.
      res.locals = res.locals || {};
      res.locals.idempotency = { key, endpoint: endpointName };
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const savePromise = idempotencyService
          .saveResponse(key, endpointName, res.statusCode, body)
          .catch(() => { /* best-effort */ });
        res.locals.idempotency.savePromise = savePromise;
        return originalJson(body);
      };

      return next();
    } catch (err) {
      return next();
    }
  };
};

module.exports = idempotency;
