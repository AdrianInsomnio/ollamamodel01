const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const controller = require('./diagnosis.controller');

router.use(authMiddleware);
router.post('/', controller.create);
router.get('/consultation/:consultationId', controller.getByConsultationId);
router.delete('/:id', controller.remove);

module.exports = router;
