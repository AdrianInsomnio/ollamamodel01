const { prisma } = require('../../lib/prisma');
const { ROLES } = require('../../core/constants/roles');

const findUserByEmail = async (email, clinicId = undefined) => {
  const where = { email };
  if (clinicId !== undefined && clinicId !== null) {
    where.clinics = { some: { id: Number(clinicId) } };
  }
  return await prisma.user.findFirst({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      organizationId: true,
      role: true,
      clinics: { select: { id: true, name: true } }
    }
  });
};

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
      password: true,
      organizationId: true,
      role: true,
      clinics: { select: { id: true, name: true } }
    }
  });
};

const findUserByEmailOrUsername = async (email, username, clinicId) => {
  const where = {
    OR: [{ email }, { username }]
  };
  if (clinicId !== undefined && clinicId !== null) {
    where.clinics = { some: { id: Number(clinicId) } };
  }
  return await prisma.user.findFirst({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      organizationId: true,
      role: true,
      clinics: { select: { id: true, name: true } }
    }
  });
};

const createUser = async (username, email, hashedPassword, organizationId, role = ROLES.USER, clinicIds = []) => {
  const data = {
    username,
    email,
    password: hashedPassword,
    organizationId,
    role
  };
  if (clinicIds.length > 0) {
    data.clinics = { connect: clinicIds.map((id) => ({ id })) };
  }
  return await prisma.user.create({
    data,
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      organizationId: true,
      role: true,
      clinics: { select: { id: true, name: true } }
    }
  });
};

const updatePassword = async (id, hashedPassword, passwordChangedAt = new Date()) => {
  return await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      passwordChangedAt,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      organizationId: true,
      clinics: { select: { id: true, name: true } }
    }
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
      password: true,
      organizationId: true,
      role: true,
      clinics: { select: { id: true, name: true } }
    }
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByEmailOrUsername,
  createUser,
  updatePassword,
  getAllUsers
};
