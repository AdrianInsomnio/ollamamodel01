const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
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

const findByConsultationId = async (consultationId, clinicId) => {
  return await prisma.prescription.findMany({
    where: {
      consultationId,
      consultation: {
        clinicId
      }
    }
  });
};

const remove = async (id, clinicId) => {
  return await prisma.prescription.delete({
    where: { id, clinicId }
  });
};

module.exports = { create, findByConsultationId, remove };

