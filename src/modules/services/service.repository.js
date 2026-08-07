const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
  return await prisma.services.create({
    data: {
      ...data,
      clinicId
    }
  });
};

const findAll = async (clinicId) => {
  return await prisma.services.findMany({
    where: { clinicId },
    orderBy: { name: 'asc' }
  });
};

const findById = async (id, clinicId) => {
  return await prisma.services.findFirst({
    where: { id, clinicId }
  });
};

const update = async (id, clinicId, data) => {
  return await prisma.services.update({
    where: { id, clinicId },
    data
  });
};

const remove = async (id, clinicId) => {
  return await prisma.services.delete({
    where: { id, clinicId }
  });
};

module.exports = { create, findAll, findById, update, remove };


