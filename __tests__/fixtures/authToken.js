const jwt = require('jsonwebtoken');
const { ROLES } = require('../../src/core/constants/roles');

const createAuthToken = (overrides = {}) => {
  const payload = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    organizationId: 1,
    role: ROLES.ADMIN,
    ...overrides,
  };

  return `Bearer ${jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  })}`;
};

module.exports = { createAuthToken };
