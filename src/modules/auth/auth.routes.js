const express = require('express');
const { register, bootstrapSuperAdmin, login, logout, changePassword } = require('./auth.controller');
const { validate } = require('../../core/middlewares/validate.middleware');
const { loginSchema, registerSchema, bootstrapSuperAdminSchema, changePasswordSchema } = require('../../validators/auth.schema');
const { authMiddleware, authorize } = require('../../core/middlewares');
const { ROLES } = require('../../core/constants/roles');

const router = express.Router();

router.post('/bootstrap-superadmin', validate(bootstrapSuperAdminSchema), bootstrapSuperAdmin);
// /register: la autorizacion se hace dentro del service.
//   - Si NO hay actor (req.user undefined) y la tabla de usuarios esta vacia,
//     se trata como bootstrap del primer SUPER_ADMIN.
//   - Si HAY actor, solo SUPER_ADMIN o ADMIN pueden crear usuarios.
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);  // No requiere auth, es idempotente
router.post('/change-password', authMiddleware, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(changePasswordSchema), changePassword);

module.exports = router;