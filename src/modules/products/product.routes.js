const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./product.controller');

router.use(authMiddleware);

// Crear producto: solo admin
router.post('/', authorize(ROLES.ADMIN), controller.create);

// Listar productos: cualquier rol autenticado
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);

// Ver detalle de producto: cualquier rol autenticado
router.get('/:id', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getById);

// Actualizar producto: solo admin
router.put('/:id', authorize(ROLES.ADMIN), controller.update);

// Eliminar producto: solo admin
router.delete('/:id', authorize(ROLES.ADMIN), controller.remove);

module.exports = router;
