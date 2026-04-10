const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.consultation.create({
    data: {
      ...data,
      organizationId
    },
    include: {
      pet: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      appointment: { select: { id: true, date: true } }
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.consultation.findMany({
    where: { organizationId },
    include: {
      pet: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.consultation.findFirst({
    where: { id, organizationId },
    include: {
      pet: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.consultation.update({
    where: { id },
    data
  });
};

module.exports = { create, findAll, findById, update };
