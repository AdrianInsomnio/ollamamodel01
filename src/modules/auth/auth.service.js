const { AppError } = require('../../core/errors/AppError');
const { hashPassword, comparePassword } = require('../../core/utils/password.util');
const { generateToken } = require('../../core/utils/jwt.util');
const userRepository = require('./auth.repository');
const { prisma } = require('../../lib/prisma');
const { ROLES } = require('../../core/constants/roles');

const register = async (username, email, password) => {
  // Check if user exists in any organization
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Create organization first
  const organization = await prisma.organization.create({
    data: {
      name: `${username}'s Organization`
    }
  });

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user associated with organization
  const user = await userRepository.createUser(
    username,
    email,
    hashedPassword,
    organization.id,
    ROLES.ADMIN
  );

  // Generate token with organizationId
  const token = generateToken({
    id: user.id,
    username: user.username,
    email: user.email,
    organizationId: organization.id,
    role: user.role || ROLES.ADMIN
  });

  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role, organizationId: organization.id },
    token,
    organization: { id: organization.id, name: organization.name }
  };
};

const login = async (email, password, organizationId) => {
  // Find user
  const user = await userRepository.findUserByEmail(email, organizationId);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate token with organizationId
  const token = generateToken({
    id: user.id,
    username: user.username,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role || ROLES.USER
  });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

module.exports = { register, login };
