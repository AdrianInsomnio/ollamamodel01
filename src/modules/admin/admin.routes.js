const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const { authorize } = require('../../core/middlewares/authorization.middleware');
const controller = require('./admin.controller');
const { validate } = require('../../core/middlewares/validate.middleware');
const {
  adminUserCreateSchema,
  adminUserUpdateSchema,
  updateUserClinicsSchema,
} = require('../../validators/admin.schema');

// Todos los endpoints requieren autenticacion y rol ADMIN o SUPER_ADMIN.
router.use(authMiddleware);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard/metrics', controller.getDashboardMetrics);
router.get('/clinics', controller.getClinics);
router.get('/clinic', controller.getClinicSettings);
router.put('/clinic', controller.updateClinicSettings);

// Listado de usuarios: ADMIN y SUPER_ADMIN.
router.get('/users', controller.getUsers);
router.post('/users', validate(adminUserCreateSchema), controller.createUser);
router.put('/users/:id', validate(adminUserUpdateSchema), controller.updateUser);
router.delete('/users/:id', controller.deleteUser);
router.put('/users/:userId/clinics', validate(updateUserClinicsSchema), controller.updateUserClinics);

module.exports = router;
