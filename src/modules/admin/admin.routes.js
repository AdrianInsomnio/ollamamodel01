const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const { authorize } = require('../../core/middlewares/authorization.middleware');
const controller = require('./admin.controller');

// Todos los endpoints requieren autenticacion y rol ADMIN o SUPER_ADMIN.
router.use(authMiddleware);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard/metrics', controller.getDashboardMetrics);
router.get('/clinics', controller.getClinics);

// Listado de usuarios: solo SUPER_ADMIN (el service lo valida igual).
router.get('/users', controller.getUsers);
router.post('/', controller.createUser);
router.put('/users/:userId/clinics', controller.updateUserClinics);

module.exports = router;

