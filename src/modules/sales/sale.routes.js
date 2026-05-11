const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./sale.controller');

router.use(authMiddleware);

// Todas las operaciones de ventas requieren autenticación
// Crear venta: cualquier rol (admin, vet, assistant)
router.post('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.create);

// Listar ventas: cualquier rol
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);

// Ver detalle de venta: cualquier rol
router.get('/:id', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getById);

module.exports = router;
