const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.appointment.create({
    data: {
      ...data,
      organizationId
    },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } }
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.appointment.findMany({
    where: { organizationId },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } }
    },
    orderBy: { date: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } }
    }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.appointment.update({
    where: { id },
    data
  });
};

const remove = async (id, organizationId) => {
  return await prisma.appointment.delete({
    where: { id }
  });
};

module.exports = { create, findAll, findById, update, remove };
