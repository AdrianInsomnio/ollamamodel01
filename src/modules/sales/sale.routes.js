const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const idempotency = require('../../core/idempotency/idempotency.middleware');
const controller = require('./sale.controller');

router.use(authMiddleware);

// POST /api/sales: idempotente bajo Idempotency-Key.
// La key puede ser cualquier string 8-200 chars (UUID v4, nanoID, etc).
// Si el cliente la manda y la pareja (key, endpoint) ya tiene una respuesta
// cacheada dentro de la ventana TTL (24h default), devolvemos la misma
// respuesta (status + body) sin ejecutar el handler de negocio.
// Sin key, el middleware es no-op.
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER),
  idempotency('POST /api/sales'),
  controller.create
);

// Listar ventas: cualquier rol
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);

// Ver detalle de venta: cualquier rol
router.get('/:id', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getById);

module.exports = router;