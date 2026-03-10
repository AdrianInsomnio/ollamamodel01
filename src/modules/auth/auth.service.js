const { AppError } = require('../../core/errors/AppError');
const { hashPassword, comparePassword } = require('../../core/utils/password.util');
const { generateToken } = require('../../core/utils/jwt.util');
const userRepository = require('./auth.repository');

const register = async (username, email, password) => {
  // Check if user exists
  const userExists = await userRepository.findUserByEmailOrUsername(email, username);
  if (userExists) {
    throw new AppError('User already exists', 400);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await userRepository.createUser(username, email, hashedPassword);

  // Generate token
  const token = generateToken({ id: user.id, username: user.username, email: user.email });

  return { user, token };
};

const login = async (email, password) => {
  // Find user
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken({ id: user.id, username: user.username, email: user.email });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

module.exports = { register, login };
