const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const controller = require('./sale.controller');

router.use(authMiddleware);

// Todas las operaciones de ventas requieren autenticación
// Crear venta: cualquier rol (admin, vet, assistant)
router.post('/', authorize('admin', 'vet', 'assistant'), controller.create);

// Listar ventas: cualquier rol
router.get('/', authorize('admin', 'vet', 'assistant'), controller.getAll);

// Ver detalle de venta: cualquier rol
router.get('/:id', authorize('admin', 'vet', 'assistant'), controller.getById);

module.exports = router;
