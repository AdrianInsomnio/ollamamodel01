const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.prescription.create({
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
  return await prisma.prescription.findMany({
    where: {
      consultationId,
      consultation: {
        organizationId
      }
    }
  });
};

const remove = async (id, organizationId) => {
  return await prisma.prescription.delete({
    where: { id }
  });
};

module.exports = { create, findByConsultationId, remove };
