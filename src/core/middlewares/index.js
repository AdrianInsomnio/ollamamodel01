/**
 * Middlewares exportados del core
 * Facilita la importación de todos los middlewares desde un solo punto
 */

const { authMiddleware, optionalAuthMiddleware } = require('./auth.middleware');
const { errorMiddleware } = require('./error.middleware');
const { httpLogger } = require('./logger.middleware');
const { validate } = require('./validate.middleware');
const { authorize, authorizeOwnerOrAdmin, authorizeOrganization } = require('./authorization.middleware');

module.exports = {
  // Autenticación
  authMiddleware,
  optionalAuthMiddleware,

  // Autorización
  authorize,
  authorizeOwnerOrAdmin,
  authorizeOrganization,

  // Errores
  errorMiddleware,

  // Logging
  httpLogger,

  // Validación
  validate
};
