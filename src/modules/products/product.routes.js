const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const controller = require('./product.controller');

router.use(authMiddleware);

// Crear producto: solo admin
router.post('/', authorize('admin'), controller.create);

// Listar productos: cualquier rol autenticado
router.get('/', authorize('admin', 'vet', 'assistant'), controller.getAll);

// Ver detalle de producto: cualquier rol autenticado
router.get('/:id', authorize('admin', 'vet', 'assistant'), controller.getById);

// Actualizar producto: solo admin
router.put('/:id', authorize('admin'), controller.update);

// Eliminar producto: solo admin
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
