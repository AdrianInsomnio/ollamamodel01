const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./category.controller');

router.use(authMiddleware);
router.get('/', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.VET, ROLES.USER), controller.getAll);
router.post('/', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.update);
router.patch('/:id/status', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), controller.updateStatus);

module.exports = router;
