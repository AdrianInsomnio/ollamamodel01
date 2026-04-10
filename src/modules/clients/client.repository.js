const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.client.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.client.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.client.findFirst({
    where: { id, organizationId }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.client.update({
    where: { id },
    data
  });
};

const remove = async (id, organizationId) => {
  return await prisma.client.delete({
    where: { id }
  });
};

module.exports = { create, findAll, findById, update, remove };
