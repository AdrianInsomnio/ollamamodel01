const { getPool } = require('../../config/connection');

const findUserByEmail = async (email) => {
  const pool = getPool();
  const [users] = await pool.query(
    'SELECT id, username, email, password FROM users WHERE email = ?',
    [email]
  );
  return users[0] || null;
};

const findUserById = async (id) => {
  const pool = getPool();
  const [users] = await pool.query(
    'SELECT id, username, email, created_at FROM users WHERE id = ?',
    [id]
  );
  return users[0] || null;
};

const findUserByEmailOrUsername = async (email, username) => {
  const pool = getPool();
  const [users] = await pool.query(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );
  return users.length > 0;
};

const createUser = async (username, email, hashedPassword) => {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  );
  return { id: result.insertId, username, email };
};

const getAllUsers = async () => {
  const pool = getPool();
  const [users] = await pool.query(
    'SELECT id, username, email, created_at FROM users'
  );
  return users;
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByEmailOrUsername,
  createUser,
  getAllUsers
};
