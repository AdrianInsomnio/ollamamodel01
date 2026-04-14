const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.client.create({
    data: {
      ...data,
      organizationId
    },
    include: {
      pets: true
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.client.findMany({
    where: { organizationId },
    include: {
      pets: true,
      _count: {
        select: { sales: true, appointments: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      pets: true,
      sales: true,
      appointments: true,
      consultations: true
    }
  });
};

const findByEmail = async (email, organizationId) => {
  return await prisma.client.findFirst({
    where: { email, organizationId }
  });
};

const findByDocumentId = async (documentId, organizationId) => {
  return await prisma.client.findFirst({
    where: { documentId, organizationId }
  });
};

const getClientHistory = async (id, organizationId) => {
  return await prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      pets: {
        include: {
          appointments: {
            orderBy: { date: 'desc' }
          },
          consultations: {
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      sales: {
        orderBy: { createdAt: 'desc' }
      },
      appointments: {
        orderBy: { date: 'desc' }
      }
    }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.client.update({
    where: { id },
    data,
    include: {
      pets: true
    }
  });
};

const remove = async (id, organizationId) => {
  return await prisma.client.delete({
    where: { id }
  });
};

module.exports = {
  create,
  findAll,
  findById,
  findByEmail,
  findByDocumentId,
  getClientHistory,
  update,
  remove
};
