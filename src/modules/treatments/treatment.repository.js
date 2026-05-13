const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.treatment.create({
    data: {
      ...data,
      consultation: {
        connect: {
          id: data.consultationId
        }
      }
    },
    include: {
      consultation: {
        select: { id: true, petId: true }
      }
    }
  });
};

const findByConsultationId = async (consultationId, organizationId) => {
  return await prisma.treatment.findMany({
    where: {
      consultationId,
      consultation: {
        organizationId
      }
    }
  });
};

const remove = async (id, organizationId) => {
  return await prisma.treatment.delete({
    where: { id, organizationId }
  });
};

module.exports = { create, findByConsultationId, remove };

