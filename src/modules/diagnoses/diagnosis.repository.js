const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
  return await prisma.diagnosis.create({
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
  const diagnoses = await prisma.diagnosis.findMany({
    where: {
      consultationId,
      consultation: {
        clinicId
      }
    }
  });
  return diagnoses;
};

const remove = async (id, clinicId) => {
  return await prisma.diagnosis.delete({
    where: { id, clinicId }
  });
};

module.exports = { create, findByConsultationId, remove };

