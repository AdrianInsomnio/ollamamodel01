const express = require('express');
const { register, login } = require('./auth.controller');
const { validate } = require('../../core/middlewares/validate.middleware');
const { loginSchema, registerSchema } = require('../../validators/auth.schema');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

module.exports = router;
