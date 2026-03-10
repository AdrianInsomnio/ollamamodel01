const express = require('express');
const { authMiddleware } = require('../../core/middlewares/auth.middleware');
const { getProfile, getAll } = require('./user.controller');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.get('/', authMiddleware, getAll);

module.exports = router;
