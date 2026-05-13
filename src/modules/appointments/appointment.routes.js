const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./appointment.controller');

router.use(authMiddleware);

// Crear cita: cualquier rol (admin, vet, assistant)
router.post('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.create);

// Listar citas: cualquier rol
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);

// Ver slots disponibles: cualquier rol
router.get('/slots', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAvailableSlots);

// Ver detalle de cita: cualquier rol
router.get('/:id', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getById);

// Actualizar estado: cualquier rol (podría restringirse más según la lógica de negocio)
router.put('/:id/status', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.updateStatus);

// Actualizar cita: admin y vet (assistant no puede modificar citas existentes)
router.put('/:id', authorize(ROLES.ADMIN, ROLES.VET), controller.update);

// Eliminar cita: solo admin
router.delete('/:id', authorize(ROLES.ADMIN), controller.remove);

module.exports = router;
