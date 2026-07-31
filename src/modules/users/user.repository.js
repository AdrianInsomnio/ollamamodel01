const { prisma } = require('../../lib/prisma');

const findUserById = async (id, clinicId) => {
  const where = { id };
  if (clinicId !== undefined && clinicId !== null) {
    where.clinics = { some: { id: Number(clinicId) } };
  }
  return await prisma.user.findFirst({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      clinics: { select: { id: true, name: true } },
    },
  });
};

const getAllUsers = async (clinicId) => {
  const where = {};
  if (clinicId !== undefined && clinicId !== null) {
    where.clinics = { some: { id: Number(clinicId) } };
  }
  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      clinics: { select: { id: true, name: true } },
    },
  });
};

module.exports = { findUserById, getAllUsers };
