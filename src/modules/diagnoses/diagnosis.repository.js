const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
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

const findByConsultationId = async (consultationId, organizationId) => {
  const diagnoses = await prisma.diagnosis.findMany({
    where: {
      consultationId,
      consultation: {
        organizationId
      }
    }
  });
  return diagnoses;
};

const remove = async (id, organizationId) => {
  return await prisma.diagnosis.delete({
    where: { id }
  });
};

module.exports = { create, findByConsultationId, remove };
