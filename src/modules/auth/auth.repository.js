const { prisma } = require('../../lib/prisma');

const findUserByEmail = async (email, organizationId) => {
  return await prisma.user.findFirst({
    where: { email, organizationId },
    select: { id: true, username: true, email: true, password: true, organizationId: true }
  });
};

const findUserById = async (id, organizationId) => {
  return await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, createdAt: true, organizationId: true }
  });
};

const findUserByEmailOrUsername = async (email, username, organizationId) => {
  return await prisma.user.findFirst({
    where: {
      organizationId,
      OR: [{ email }, { username }]
    }
  });
};

const createUser = async (username, email, hashedPassword, organizationId) => {
  return await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      organizationId
    }
  });
};

const getAllUsers = async (organizationId) => {
  return await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, username: true, email: true, createdAt: true, organizationId: true }
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByEmailOrUsername,
  createUser,
  getAllUsers
};
