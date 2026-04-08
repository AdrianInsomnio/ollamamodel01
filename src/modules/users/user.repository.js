const { prisma } = require('../../lib/prisma');

const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, createdAt: true }
  });
};

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: { id: true, username: true, email: true, createdAt: true }
  });
};

module.exports = { findUserById, getAllUsers };
