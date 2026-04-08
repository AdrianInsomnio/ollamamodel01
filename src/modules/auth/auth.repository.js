const { prisma } = require('../../lib/prisma');

const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, password: true }
  });
};

const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, createdAt: true }
  });
};

const findUserByEmailOrUsername = async (email, username) => {
  return await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });
};

const createUser = async (username, email, hashedPassword) => {
  return await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword
    }
  });
};

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: { id: true, username: true, email: true, createdAt: true }
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByEmailOrUsername,
  createUser,
  getAllUsers
};
