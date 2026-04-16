const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const controller = require('./pet.controller');

router.use(authMiddleware);
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id/history', controller.getFullHistory);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
