const { prisma } = require("../../lib/prisma");

const create = async (data, clinicId) => {
  return await prisma.client.create({
    data: {
      ...data,
      clinicId
    },
    include: {
      pets: true
    }
  });
};

const findAll = async (clinicId) => {
  return await prisma.client.findMany({
    where: { clinicId },
    include: {
      pets: true,
      _count: {
        select: { sales: true, appointments: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

const findById = async (id, clinicId) => {
  return await prisma.client.findFirst({
    where: { id, clinicId },
    include: {
      pets: true,
      sales: true,
      appointments: true,
      consultations: true
    }
  });
};

const findByEmail = async (email, clinicId) => {
  return await prisma.client.findFirst({
    where: { email, clinicId }
  });
};

const findByDocumentId = async (documentId, clinicId) => {
  return await prisma.client.findFirst({
    where: { documentId, clinicId }
  });
};

const search = async (query, clinicId) => {
  const searchQuery = query.trim();
  return await prisma.client.findMany({
    where: {
      clinicId,
      OR: [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { documentId: { contains: searchQuery, mode: "insensitive" } },
        { phone: { contains: searchQuery } }
      ]
    },
    include: {
      pets: true,
      _count: {
        select: { sales: true, appointments: true }
      }
    },
    take: 20,
    orderBy: { name: "asc" }
  });
};

const createWithPet = async (clientData, petData, clinicId) => {
  return await prisma.client.create({
    data: {
      ...clientData,
      clinicId,
      pets: {
        create: {
          ...petData,
          clinicId
        }
      }
    },
    include: {
      pets: true
    }
  });
};

const getClientHistory = async (id, clinicId) => {
  return await prisma.client.findFirst({
    where: { id, clinicId },
    include: {
      pets: {
        include: {
          appointments: {
            orderBy: { date: "desc" }
          },
          consultations: {
            orderBy: { createdAt: "desc" }
          }
        }
      },
      sales: {
        orderBy: { createdAt: "desc" }
      },
      appointments: {
        orderBy: { date: "desc" }
      }
    }
  });
};

const update = async (id, clinicId, data) => {
  return await prisma.client.update({
    where: { id, clinicId },
    data,
    include: {
      pets: true
    }
  });
};

const remove = async (id, clinicId) => {
  return await prisma.client.delete({
    where: { id, clinicId }
  });
};

module.exports = {
  create,
  findAll,
  findById,
  findByEmail,
  findByDocumentId,
  search,
  createWithPet,
  getClientHistory,
  update,
  remove
};
