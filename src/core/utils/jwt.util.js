const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');

const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

module.exports = { generateToken, verifyToken, jwtConfig };
