const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
  return await prisma.consultation.create({
    data: {
      ...data,
      clinicId
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

const findAll = async (clinicId) => {
  return await prisma.consultation.findMany({
    where: { clinicId },
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

const findById = async (id, clinicId) => {
  return await prisma.consultation.findFirst({
    where: { id, clinicId },
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

const findByPetId = async (petId, clinicId) => {
  return await prisma.consultation.findMany({
    where: { petId, clinicId },
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

const findByClientId = async (clientId, clinicId) => {
  return await prisma.consultation.findMany({
    where: { clientId, clinicId },
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

const update = async (id, clinicId, data) => {
  return await prisma.consultation.update({
    where: { id, clinicId },
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

const remove = async (id, clinicId) => {
  // Verificar si hay diagnósticos (puede ser restricción)
  const consultation = await findById(id, clinicId);
  if (consultation.diagnoses.length > 0) {
    throw new Error('Cannot delete consultation with diagnoses');
  }

  // Eliminar relaciones primero
  await prisma.treatment.deleteMany({ where: { consultationId: id } });
  await prisma.prescription.deleteMany({ where: { consultationId: id } });

  return await prisma.consultation.delete({
    where: { id, clinicId }
  });
};

const updateStatus = async (id, status, closedAt = null) => {
  return await prisma.consultation.update({
    where: { id, clinicId },
    data: {
      status,
      ...(closedAt && { closedAt })
    },
    include: {
      pet: true,
      client: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true
    }
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
  remove,
  updateStatus
};

