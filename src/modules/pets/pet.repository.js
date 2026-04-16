const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.pet.create({
    data: {
      ...data,
      organizationId
    },
    include: {
      client: {
        select: { id: true, name: true }
      }
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.pet.findMany({
    where: { organizationId },
    include: {
      client: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.pet.findFirst({
    where: { id, organizationId },
    include: {
      client: {
        select: { id: true, name: true }
      }
    }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.pet.update({
    where: { id },
    data
  });
};

const remove = async (id, organizationId) => {
  return await prisma.pet.delete({
    where: { id }
  });
};

const getFullHistory = async (id, organizationId) => {
  return await prisma.pet.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      consultations: {
        orderBy: { createdAt: 'desc' },
        include: {
          diagnoses: true,
          treatments: true,
          prescriptions: true
        }
      },
      appointments: {
        orderBy: { date: 'desc' }
      },
      sales: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true
        }
      }
    }
  });
};

module.exports = { create, findAll, findById, update, remove, getFullHistory };
