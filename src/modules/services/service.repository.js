const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.service.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.service.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.service.findFirst({
    where: { id, organizationId }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.service.update({
    where: { id },
    data
  });
};

const remove = async (id, organizationId) => {
  return await prisma.service.delete({
    where: { id }
  });
};

module.exports = { create, findAll, findById, update, remove };
