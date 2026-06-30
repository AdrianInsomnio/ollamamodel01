const { prisma } = require('../../lib/prisma');

/**
 * Servicio de idempotencia.
 *
 * Persiste en la tabla IdempotencyKey la respuesta canonica
 * (statusCode + body) asociada a la pareja (key, endpoint). Si la misma
 * pareja vuelve a llegar dentro de la ventana TTL, devolvemos la respuesta
 * guardada en lugar de ejecutar el handler de negocio.
 *
 * - key     : valor del header Idempotency-Key enviado por el cliente.
 * - endpoint: nombre logico del endpoint (ej. 'POST /api/sales').
 * - TTL       : env.idempotencyTtl en minutos (default 1440 = 24h).
 *
 * Decisiones:
 *  - Solo persistimos 2xx/3xx. Errores 4xx (cliente puede reintentar
 *    con payload corregido bajo la misma key) y 5xx (transitorios) NO
 *    se persisten, para no envenenar la cache.
 *  - Upsert por @@unique([key, endpoint]) para resolver concurrencia.
 */

let env = null;
try {
  env = () => require('../../config/env').env;
} catch (_) {
  env = () => ({ idempotencyTtl: 1440 });
}

const TTL_FALLBACK_MINUTES = 1440;

const isExpired = (createdAt) => {
  const ttlMinutes = (env().idempotencyTtl || TTL_FALLBACK_MINUTES);
  const ageMinutes = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
  return ageMinutes >= ttlMinutes;
};

const findReplay = async (key, endpoint) => {
  if (!key || !endpoint) return { hit: false };
  const row = await prisma.idempotencyKey.findUnique({
    where: { key_endpoint: { key, endpoint } },
  });
  if (!row) return { hit: false };
  if (isExpired(row.createdAt)) {
    await prisma.idempotencyKey.delete({
      where: { key_endpoint: { key, endpoint } },
    }).catch(() => { /* best-effort cleanup */ });
    return { hit: false };
  }
  return {
    hit: true,
    statusCode: row.statusCode,
    response: row.response,
  };
};

const saveResponse = async (key, endpoint, statusCode, response) => {
  if (!key || !endpoint) return;
  // Excluir 4xx y 5xx explicitamente. Solo 2xx/3xx.
  if (statusCode < 200 || statusCode >= 400) return;
  try {
    await prisma.idempotencyKey.upsert({
      where: { key_endpoint: { key, endpoint } },
      create: { key, endpoint, statusCode, response },
      update: { statusCode, response },
    });
  } catch (_) {
    // Best-effort.
  }
};

module.exports = {
  findReplay,
  saveResponse,
  isExpired,
  TTL_FALLBACK_MINUTES,
};
