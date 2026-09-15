const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');
const controller = require('./category.controller');

router.use(authMiddleware);
router.get('/', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getAll);
router.get('/:categoryId/subcategories', authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER), controller.getSubcategories);
router.post('/:categoryId/subcategories', authorize(ROLES.ADMIN), controller.createSubcategory);
router.put('/:categoryId/subcategories/:id', authorize(ROLES.ADMIN), controller.updateSubcategory);
router.patch('/:categoryId/subcategories/:id/status', authorize(ROLES.ADMIN), controller.updateSubcategoryStatus);
router.post('/', authorize(ROLES.ADMIN), controller.create);
router.put('/:id', authorize(ROLES.ADMIN), controller.update);
router.patch('/:id/status', authorize(ROLES.ADMIN), controller.updateStatus);

module.exports = router;
