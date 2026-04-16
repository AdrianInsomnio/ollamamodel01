const { AppError } = require('../errors/AppError');

/**
 * Middleware de autorización por roles
 * Verifica que el usuario tenga uno de los roles permitidos
 *
 * @param {...string} allowedRoles - Roles permitidos para acceder al recurso
 * @returns {Function} Middleware de Express
 *
 * @example
 * // Solo admin puede eliminar usuarios
 * router.delete('/:id', authMiddleware, authorize('admin'), userController.remove);
 *
 * // Admin y vet pueden crear consultas
 * router.post('/', authMiddleware, authorize('admin', 'vet'), consultationController.create);
 *
 * // Cualquier usuario autenticado (incluyendo assistant)
 * router.get('/', authMiddleware, authorize('admin', 'vet', 'assistant'), consultationController.getAll);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado (debe ser ejecutado después de authMiddleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role } = req.user;

    // Verificar si el rol del usuario está en los roles permitidos
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
        currentRole: role
      });
    }

    // El rol está permitido, continuar
    next();
  };
};

/**
 * Middleware de autorización por propiedad de recurso
 * Verifica que el usuario sea el propietario del recurso o tenga un rol administrativo
 *
 * @param {Function} getResourceOwnerId - Función que extrae el ownerId del recurso (req) => ownerId
 * @param {...string} adminRoles - Roles que pueden acceder sin ser propietarios
 * @returns {Function} Middleware de Express
 *
 * @example
 * // Solo el dueño o admin puede ver/editar su propio perfil
 * router.get('/:id', authMiddleware, authorizeOwnerOrAdmin(
 *   (req) => parseInt(req.params.id),
 *   'admin'
 * ), userController.getById);
 */
const authorizeOwnerOrAdmin = (getResourceOwnerId, ...adminRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id: userId, role } = req.user;
    const resourceOwnerId = await getResourceOwnerId(req);

    // Si es un rol administrativo, permitir acceso
    if (adminRoles.includes(role)) {
      return next();
    }

    // Si es el propietario del recurso, permitir acceso
    if (userId === resourceOwnerId) {
      return next();
    }

    // No es propietario ni admin, denegar acceso
    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own resources'
    });
  };
};

/**
 * Middleware de autorización por organización
 * Verifica que el usuario pertenezca a la organización solicitada
 *
 * @returns {Function} Middleware de Express
 */
const authorizeOrganization = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { organizationId } = req.user;
    const requestedOrgId = parseInt(req.params.organizationId) ||
                           parseInt(req.body.organizationId) ||
                           parseInt(req.query.organizationId);

    // Si no hay organizationId en la request, permitir (se asume la del token)
    if (!requestedOrgId) {
      return next();
    }

    // Verificar que el usuario pertenezca a la organización solicitada
    if (organizationId !== requestedOrgId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this organization'
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  authorizeOwnerOrAdmin,
  authorizeOrganization
};
