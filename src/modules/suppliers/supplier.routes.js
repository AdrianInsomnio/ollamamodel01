const express = require('express');
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./supplier.controller');

const router = express.Router();
router.use(authMiddleware, authorize(ROLES.ADMIN));
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
