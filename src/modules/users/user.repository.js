const { prisma } = require('../../lib/prisma');

const findUserById = async (id, organizationId) => {
  return await prisma.user.findFirst({
    where: { id, organizationId },
    select: { id: true, username: true, email: true, createdAt: true, organizationId: true }
  });
};

const getAllUsers = async (organizationId) => {
  return await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, username: true, email: true, createdAt: true, organizationId: true }
  });
};

module.exports = { findUserById, getAllUsers };
