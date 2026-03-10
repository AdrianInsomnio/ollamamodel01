const { getPool } = require('../../config/connection');

const findUserById = async (id) => {
  const pool = getPool();
  const [users] = await pool.query(
    'SELECT id, username, email, created_at FROM users WHERE id = ?',
    [id]
  );
  return users[0] || null;
};

const getAllUsers = async () => {
  const pool = getPool();
  const [users] = await pool.query(
    'SELECT id, username, email, created_at FROM users'
  );
  return users;
};

module.exports = { findUserById, getAllUsers };
