const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.product.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.product.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.product.findFirst({
    where: { id, organizationId }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.product.update({
    where: { id },
    data
  });
};

const remove = async (id, organizationId) => {
  return await prisma.product.delete({
    where: { id }
  });
};

module.exports = { create, findAll, findById, update, remove };
