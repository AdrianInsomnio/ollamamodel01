const express = require('express');
const { authMiddleware, authorize } = require('../../core/middlewares');
const { getProfile, getAll } = require('./user.controller');

const router = express.Router();

// Perfil del usuario autenticado (cualquier rol)
router.get('/profile', authMiddleware, getProfile);

// Listar todos los usuarios (solo admin)
router.get('/', authMiddleware, authorize('admin'), getAll);

module.exports = router;
