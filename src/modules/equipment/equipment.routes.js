const express = require('express');
const router = express.Router();
const { authMiddleware, authorize, validate } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./equipment.controller');
const schemas = require('../../validators/equipment.schema');

router.use(authMiddleware);
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);
router.post('/', authorize(ROLES.ADMIN), validate(schemas.createEquipmentSchema), controller.create);
router.patch('/:id', authorize(ROLES.ADMIN), validate(schemas.updateEquipmentSchema), controller.update);

module.exports = router;
