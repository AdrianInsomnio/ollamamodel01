const { prisma } = require('../../lib/prisma');
const { getClinicDayBounds } = require('../../lib/date.util');
const { AppError } = require('../../core/errors/AppError');

const consultorioInclude = { include: { equipment: { include: { equipment: true } } } };

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
      prescriptions: true,
      consultorio: consultorioInclude
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
      prescriptions: true,
      consultorio: consultorioInclude
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findQueue = async (clinicId) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { timezone: true } });
  const { startOfDay, endOfDay } = getClinicDayBounds(clinic);
  const consultations = await prisma.consultation.findMany({
    where: { clinicId, status: 'OPEN', createdAt: { gte: startOfDay, lt: endOfDay } },
    include: { pet: true, client: true, appointment: true, diagnoses: true, treatments: true, prescriptions: true, consultorio: consultorioInclude },
    orderBy: { createdAt: 'asc' }
  });

  const priorityOrder = { URGENT: 0, SCHEDULED: 1, NORMAL: 2 };
  return consultations.sort((a, b) => {
    const priorityDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    return priorityDiff || new Date(a.createdAt) - new Date(b.createdAt);
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
      sales: true,
      consultorio: consultorioInclude
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
      prescriptions: true,
      consultorio: consultorioInclude
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
      prescriptions: true,
      consultorio: consultorioInclude
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
  const consultation = await prisma.consultation.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!consultation) return null;
  return await prisma.consultation.update({
    where: { id: consultation.id },
    data,
    include: {
      pet: true,
      client: true,
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true,
      consultorio: consultorioInclude
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
    where: { id }
  });
};

const updateStatus = async (id, clinicId, status, closedAt = null) => {
  const consultation = await prisma.consultation.findFirst({
    where: { id, clinicId },
    select: { id: true },
  });
  if (!consultation) return null;

  return await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status,
      ...(closedAt && { closedAt }),
      ...(status === 'CLOSED' && { consultorioId: null, startAt: null, endAt: null })
    },
    include: {
      pet: true,
      client: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true,
      consultorio: consultorioInclude
    }
  });
};

const findByAppointmentId = async (appointmentId, clinicId) => {
  return await prisma.consultation.findFirst({
    where: { appointmentId: Number(appointmentId), clinicId },
    include: {
      pet: true,
      client: true,
      appointment: true,
      diagnoses: true,
      treatments: true,
      prescriptions: true,
      sales: true,
      consultorio: consultorioInclude
    }
  });
};

const consultationInclude = {
  pet: true,
  client: true,
  appointment: true,
  diagnoses: true,
  treatments: true,
  prescriptions: true,
  consultorio: consultorioInclude
};

const assignConsultorio = async (id, clinicId, consultorioId, startAt, endAt) => {
  let attempt = 0;
  while (attempt < 3) {
    try {
      return await prisma.$transaction(async (tx) => {
        const consultation = await tx.consultation.findFirst({
          where: { id, clinicId },
          select: { id: true }
        });
        if (!consultation) return null;

        const consultorio = await tx.consultorio.findFirst({
          where: { id: consultorioId, clinicId },
          select: { id: true, status: true }
        });
        if (!consultorio) throw new AppError('Consultorio not found', 404);
        if (consultorio.status !== 'ACTIVE') {
          throw new AppError('Consultorio is not active', 400);
        }

        const conflict = await tx.consultation.findFirst({
          where: {
            clinicId,
            consultorioId,
            id: { not: id },
            status: { not: 'CANCELED' },
            startAt: { lt: endAt },
            endAt: { gt: startAt }
          },
          select: { id: true }
        });
        if (conflict) {
          throw new AppError('Consultorio is already occupied during the requested time', 409, 'CONSULTORIO_OCCUPIED');
        }

        return tx.consultation.update({
          where: { id },
          data: { consultorioId, startAt, endAt },
          include: consultationInclude
        });
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error.code === 'P2034' && attempt < 2) {
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
};

const releaseConsultorio = async (id, clinicId) => {
  const consultation = await prisma.consultation.findFirst({
    where: { id, clinicId },
    select: { id: true }
  });
  if (!consultation) return null;
  return prisma.consultation.update({
    where: { id: consultation.id },
    data: { consultorioId: null, startAt: null, endAt: null },
    include: consultationInclude
  });
};

module.exports = {
  create,
  findAll,
  findQueue,
  findById,
  findByAppointmentId,
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
  updateStatus,
  assignConsultorio,
  releaseConsultorio
};

