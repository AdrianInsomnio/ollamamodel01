const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getPool } = require('../config/database');

const router = express.Router();

// Get current user profile (protected)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Get all users (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, username, email, created_at FROM users'
    );

    res.json({ users });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

module.exports = router;
