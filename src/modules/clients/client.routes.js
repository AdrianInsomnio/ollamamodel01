const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const controller = require('./client.controller');

router.use(authMiddleware);
router.get('/search', controller.search);
router.post('/with-pet', controller.createWithPet);
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
