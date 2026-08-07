const { verifyToken } = require('../utils/jwt.util');
const { ROLES } = require('../constants/roles');
const { readAuthCookie } = require('../utils/cookie.util');
const { prisma } = require('../../lib/prisma');
const { AppError } = require('../errors/AppError');

let env = null;
try {
  // Lazy require para que los tests puedan mutar env.authViaCookie sin
  // recargar el modulo (mismo patron que cookie.util).
  env = () => require('../../config/env').env;
} catch (_) {
  env = () => ({ authViaCookie: false });
}

const extractToken = (req) => {
  if (env().authViaCookie) {
    return readAuthCookie(req);
  }
  const authHeader = req.headers && req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
};

const decodeAndAttach = async (req, token) => {
  const decoded = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      organizationId: true,
      clinics: {
        select: { id: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 401, 'UNAUTHORIZED');
  }

  // SUPER_ADMIN tiene scope a nivel organizacion y no requiere clinic asignada.
  // Para ADMIN / VET / USER seguimos exigiendo al menos una clinic.
  const hasClinic = user.clinics && user.clinics.length > 0;
  if (!hasClinic && user.role !== ROLES.SUPER_ADMIN) {
    // Coherente con auth.service.login que lanza 403 NO_CLINIC.
    throw new AppError('User has no clinic assigned', 403, 'NO_CLINIC_ASSIGNED');
  }

  if (user.passwordChangedAt && decoded.iat) {
    const passwordChangedAt = new Date(user.passwordChangedAt).getTime();
    const tokenIssuedAt = decoded.iat * 1000;
    if (tokenIssuedAt <= passwordChangedAt) {
      throw new AppError('Token is no longer valid', 401, 'TOKEN_REVOKED');
    }
  }

  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role || ROLES.USER,
    // clinicId puede ser undefined para SUPER_ADMIN sin clinics.
    // Las queries a nivel organizacion usan organizationId en su lugar.
    clinicId: hasClinic ? user.clinics[0].id : null,
  };
};

const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'No token provided',
    });
  }
  try {
    await decodeAndAttach(req, token);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    }
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but does not require it.
 */
const optionalAuthMiddleware = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    await decodeAndAttach(req, token);
  } catch (_) {
    // Invalid token is ignored for optional auth
  }
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware };