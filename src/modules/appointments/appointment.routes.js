const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const controller = require('./appointment.controller');

router.use(authMiddleware);

// Crear cita: cualquier rol (admin, vet, assistant)
router.post('/', authorize('admin', 'vet', 'assistant'), controller.create);

// Listar citas: cualquier rol
router.get('/', authorize('admin', 'vet', 'assistant'), controller.getAll);

// Ver slots disponibles: cualquier rol
router.get('/slots', authorize('admin', 'vet', 'assistant'), controller.getAvailableSlots);

// Ver detalle de cita: cualquier rol
router.get('/:id', authorize('admin', 'vet', 'assistant'), controller.getById);

// Actualizar estado: cualquier rol (podría restringirse más según la lógica de negocio)
router.put('/:id/status', authorize('admin', 'vet', 'assistant'), controller.updateStatus);

// Actualizar cita: admin y vet (assistant no puede modificar citas existentes)
router.put('/:id', authorize('admin', 'vet'), controller.update);

// Eliminar cita: solo admin
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
