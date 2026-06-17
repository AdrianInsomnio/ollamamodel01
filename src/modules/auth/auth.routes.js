const express = require('express');
const { register, login, logout } = require('./auth.controller');
const { validate } = require('../../core/middlewares/validate.middleware');
const { loginSchema, registerSchema } = require('../../validators/auth.schema');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);  // No requiere auth, es idempotente

module.exports = router;
