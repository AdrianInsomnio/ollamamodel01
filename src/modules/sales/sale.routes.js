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

router.post(
  '/waiting',
  authorize(ROLES.ADMIN, ROLES.USER),
  idempotency('POST /api/sales/waiting'),
  controller.waiting,
);

router.get(
  '/waiting',
  authorize(ROLES.ADMIN, ROLES.USER),
  controller.getWaiting,
);

// Compatibilidad temporal con clientes que todavía usan los paths anteriores.
router.post('/hold', authorize(ROLES.ADMIN, ROLES.USER), idempotency('POST /api/sales/waiting'), controller.waiting);
router.get('/held', authorize(ROLES.ADMIN, ROLES.USER), controller.getWaiting);

// Listar ventas: cualquier rol
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);

// Ver detalle de venta: cualquier rol
router.get('/:id', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getById);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.USER),
  idempotency('PUT /api/sales/:id'),
  controller.update,
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.USER),
  idempotency('DELETE /api/sales/:id'),
  controller.cancel,
);

router.post(
  '/:id/print',
  authorize(ROLES.ADMIN, ROLES.USER),
  idempotency('POST /api/sales/:id/print'),
  controller.print,
);

router.post(
  '/:id/resume',
  authorize(ROLES.ADMIN, ROLES.USER),
  idempotency('POST /api/sales/:id/resume'),
  controller.resume,
);

router.get(
  '/:id/prints',
  authorize(ROLES.ADMIN, ROLES.USER),
  controller.printHistory,
);

module.exports = router;
