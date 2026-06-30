const { verifyToken } = require('../utils/jwt.util');
const { ROLES } = require('../constants/roles');
const { readAuthCookie } = require('../utils/cookie.util');

let env = null;
try {
  // Lazy require para que los tests puedan mutar env.authViaCookie sin
  // recargar el modulo (mismo patron que cookie.util).
  env = () => require('../../config/env').env;
} catch (_) {
  env = () => ({ authViaCookie: false });
}

const extractToken = (req) => {
  // En modo cookie: SIEMPRE leemos de la cookie, ignorando el header
  // Authorization para que un token legado en localStorage no se pueda
  // reusar contra el backend despues de migrar a cookies.
  if (env().authViaCookie) {
    return readAuthCookie(req);
  }
  // Modo legacy: header Authorization: Bearer <token>
  const authHeader = req.headers && req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
};

const decodeAndAttach = (req, token) => {
  const decoded = verifyToken(token);
  req.user = {
    id: decoded.id,
    username: decoded.username,
    email: decoded.email,
    organizationId: decoded.organizationId,
    role: decoded.role || ROLES.USER,
  };
};

const authMiddleware = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'No token provided'
    });
  }
  try {
    decodeAndAttach(req, token);
    next();
  } catch (error) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuthMiddleware = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    decodeAndAttach(req, token);
  } catch (error) {
    // Invalid token is ignored for optional auth
  }
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware };