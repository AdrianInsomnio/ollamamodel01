const express = require('express');
const router = express.Router();
const { authMiddleware, authorize, validate } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./consultorio.controller');
const schemas = require('../../validators/consultorio.schema');

router.use(authMiddleware);
router.get('/available', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), validate(schemas.availableConsultoriosSchema), controller.getAvailable);
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);
router.post('/', authorize(ROLES.ADMIN), validate(schemas.createConsultorioSchema), controller.create);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), validate(schemas.consultorioIdSchema), controller.getById);
router.patch('/:id', authorize(ROLES.ADMIN), validate(schemas.updateConsultorioSchema), controller.update);
router.patch('/:id/status', authorize(ROLES.ADMIN), validate(schemas.updateConsultorioStatusSchema), controller.updateStatus);
router.post('/:id/equipment', authorize(ROLES.ADMIN), validate(schemas.equipmentAssociationSchema), controller.addEquipment);
router.patch('/:id/equipment/:equipmentId', authorize(ROLES.ADMIN), validate(schemas.updateEquipmentAssociationSchema), controller.updateEquipment);
router.delete('/:id/equipment/:equipmentId', authorize(ROLES.ADMIN), validate(schemas.deleteEquipmentAssociationSchema), controller.removeEquipment);

module.exports = router;
