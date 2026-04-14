const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.consultation.create({
    data: {
      ...data,
      organizationId
    },
    include: {
      pet: true,
      client: true,
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.consultation.findMany({
    where: { organizationId },
    include: {
      pet: true,
      client: true,
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.consultation.findFirst({
    where: { id, organizationId },
    include: {
      pet: true,
      client: true,
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true,
      sales: true
    }
  });
};

const findByPetId = async (petId, organizationId) => {
  return await prisma.consultation.findMany({
    where: { petId, organizationId },
    include: {
      pet: true,
      client: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findByClientId = async (clientId, organizationId) => {
  return await prisma.consultation.findMany({
    where: { clientId, organizationId },
    include: {
      pet: true,
      client: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const addDiagnosis = async (consultationId, diagnosis) => {
  return await prisma.diagnosis.create({
    data: {
      consultationId,
      description: diagnosis
    }
  });
};

const addTreatment = async (consultationId, treatment) => {
  return await prisma.treatment.create({
    data: {
      consultationId,
      description: treatment
    }
  });
};

const addPrescription = async (consultationId, prescription) => {
  return await prisma.prescription.create({
    data: {
      consultationId,
      description: prescription
    }
  });
};

const removeDiagnosis = async (diagnosisId) => {
  return await prisma.diagnosis.delete({
    where: { id: diagnosisId }
  });
};

const removeTreatment = async (treatmentId) => {
  return await prisma.treatment.delete({
    where: { id: treatmentId }
  });
};

const removePrescription = async (prescriptionId) => {
  return await prisma.prescription.delete({
    where: { id: prescriptionId }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.consultation.update({
    where: { id },
    data,
    include: {
      pet: true,
      client: true,
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    }
  });
};

const remove = async (id, organizationId) => {
  // Verificar si hay diagnósticos (puede ser restricción)
  const consultation = await findById(id, organizationId);
  if (consultation.diagnoses.length > 0) {
    throw new Error('Cannot delete consultation with diagnoses');
  }
  
  // Eliminar relaciones primero
  await prisma.treatment.deleteMany({ where: { consultationId: id } });
  await prisma.prescription.deleteMany({ where: { consultationId: id } });
  
  return await prisma.consultation.delete({
    where: { id }
  });
};

module.exports = {
  create,
  findAll,
  findById,
  findByPetId,
  findByClientId,
  addDiagnosis,
  addTreatment,
  addPrescription,
  removeDiagnosis,
  removeTreatment,
  removePrescription,
  update,
  remove
};
