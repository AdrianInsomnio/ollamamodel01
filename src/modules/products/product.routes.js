const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./product.controller');

router.use(authMiddleware);

// Crear producto: solo admin
router.post('/', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.create);

// Listar productos: cualquier rol autenticado
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);

// Ver detalle de producto: cualquier rol autenticado
router.get('/:id/movements', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.getStockMovements);
router.post('/:id/stock-adjustment', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.adjustStock);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.VET, ROLES.USER), controller.getById);

// Actualizar producto: solo admin
router.put('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.update);
router.patch('/:id/status', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.updateStatus);

// Eliminar producto: solo admin
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.remove);

module.exports = router;
