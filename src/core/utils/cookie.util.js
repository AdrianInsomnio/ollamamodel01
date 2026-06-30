let env = null;
try {
  // Lazy require para que los tests puedan mutar env antes de leerlo.
  // El modulo `config/env` exporta { env }, y leemos su propiedad actual
  // en cada llamada, no destructurando.
  env = () => require('../../config/env').env;
} catch (_) {
  env = () => ({});
}

/**
 * Helpers para emitir y limpiar la cookie que transporta el JWT cuando
 * el flag AUTH_VIA_COOKIE esta activo.
 *
 * Caracteristicas:
 *  - httpOnly: el cliente JS no puede leerla (mitiga XSS stealing).
 *  - sameSite: configurable via env (default 'lax'), mitiga CSRF basico.
 *  - secure: solo en produccion (HTTPS obligatorio en prod).
 *  - path: '/' para que aplique a /api/* y futuras rutas.
 *  - maxAge: alineado con la expiracion del JWT.
 *
 * Nota: parseamos el header Cookie a mano para evitar la dependencia
 * cookie-parser. El set via res.cookie() de Express sigue funcionando
 * porque Express ya sabe serializar cookies.
 */
let cookieLib = null;
try {
  cookieLib = require('cookie');
} catch (_) {
  cookieLib = null;
}

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: env().authCookieSameSite,
  secure: env().nodeEnv === 'production',
  path: '/',
  maxAge: env().authCookieMaxAgeMs,
});

/**
 * Setea la cookie con el JWT. No hace nada si viaCookie=false.
 */
const setAuthCookie = (res, token) => {
  if (!env().authViaCookie) return;
  res.cookie(env().authCookieName, token, buildCookieOptions());
};

/**
 * Limpia la cookie de auth en el cliente. Requiere pasar las mismas
 * opciones que se usaron en set (mismo path / sameSite / secure) para
 * que el navegador la identifique.
 */
const clearAuthCookie = (res) => {
  if (!env().authViaCookie) return;
  res.clearCookie(env().authCookieName, buildCookieOptions());
};

/**
 * Parsea el header Cookie (string crudo) a un objeto {nombre: valor}.
 * Si el modulo `cookie` esta disponible, lo usa; si no, parsea a mano.
 */
const parseCookieHeader = (header) => {
  if (!header) return {};
  if (cookieLib && typeof cookieLib.parse === 'function') {
    return cookieLib.parse(header);
  }
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
};

/**
 * Lee el token de la cookie directamente del header Cookie.
 * Devuelve null si viaCookie esta apagado o si la cookie no esta presente.
 */
const readAuthCookie = (req) => {
  if (!env().authViaCookie) return null;
  const header = req.headers && req.headers.cookie;
  const parsed = parseCookieHeader(header);
  return parsed[env().authCookieName] || null;
};

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  readAuthCookie,
  buildCookieOptions,
  parseCookieHeader,
};
