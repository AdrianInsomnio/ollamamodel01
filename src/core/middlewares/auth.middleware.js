const { verifyToken } = require('../utils/jwt.util');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    // Ensure user object has all necessary fields
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role || 'user' // Default role if not specified
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role || 'user'
    };
  } catch (error) {
    // Invalid token is ignored for optional auth
  }

  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware };
