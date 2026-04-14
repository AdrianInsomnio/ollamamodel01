const repository = require('./consultation.repository');
const petRepository = require('../pets/pet.repository');
const clientRepository = require('../clients/client.repository');
const appointmentRepository = require('../appointments/appointment.repository');
const { AppError } = require('../../core/errors/AppError');

// Validar datos médicos básicos
const validateMedicalData = (data) => {
  if (data.weight !== undefined && data.weight <= 0) {
    throw new AppError('Weight must be greater than 0', 400);
  }

  if (data.temperature !== undefined && (data.temperature < 36 || data.temperature > 42)) {
    throw new AppError('Temperature must be between 36 and 42 degrees Celsius', 400);
  }
};

const create = async (data, organizationId) => {
  // Validar campos requeridos
  if (!data.petId || !data.clientId) {
    throw new AppError('Pet and client are required', 400);
  }

  // Validar que la mascota existe
  const pet = await petRepository.findById(data.petId, organizationId);
  if (!pet) {
    throw new AppError('Pet not found', 404);
  }

  // Validar que la mascota pertenece al cliente
  if (pet.clientId !== data.clientId) {
    throw new AppError('Pet does not belong to this client', 400);
  }

  // Validar que el cliente existe
  const client = await clientRepository.findById(data.clientId, organizationId);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Validar datos médicos
  validateMedicalData(data);

  // Si hay una cita asociada, validarla
  if (data.appointmentId) {
    const appointment = await appointmentRepository.findById(data.appointmentId, organizationId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
  }

  // Calcular tarifa total si se proporciona
  if (data.consultationFee !== undefined || data.treatmentFee !== undefined) {
    const consultationFee = data.consultationFee || 0;
    const treatmentFee = data.treatmentFee || 0;
    data.totalFee = consultationFee + treatmentFee;
  }

  return await repository.create(data, organizationId);
};

const getAll = async (organizationId) => {
  return await repository.findAll(organizationId);
};

const getById = async (id, organizationId) => {
  const item = await repository.findById(id, organizationId);
  if (!item) {
    throw new AppError('Consultation not found', 404);
  }
  return item;
};

const getPetHistory = async (petId, organizationId) => {
  const consultations = await repository.findByPetId(petId, organizationId);
  if(!consultations || consultations.length === 0){
    throw new AppError('No consultations found for this pet', 404);
  }

  return {
    petId,
    consultationCount: consultations.length,
    consultations: consultations,
    totalSpent: consultations.reduce((sum, c) => sum + (c.totalFee || 0), 0)
  };
};

const getClientConsultations = async (clientId, organizationId) => {
  return await repository.findByClientId(clientId, organizationId);
};

const addDiagnosis = async (consultationId, organizationId, diagnosis) => {
  const consultation = await getById(consultationId, organizationId);

  if (!diagnosis || diagnosis.trim() === '') {
    throw new AppError('Diagnosis description is required', 400);
  }

  return await repository.addDiagnosis(consultationId, diagnosis);
};

const addTreatment = async (consultationId, organizationId, treatment) => {
  const consultation = await getById(consultationId, organizationId);

  if (!treatment || treatment.trim() === '') {
    throw new AppError('Treatment description is required', 400);
  }

  return await repository.addTreatment(consultationId, treatment);
};

const addPrescription = async (consultationId, organizationId, prescription) => {
  const consultation = await getById(consultationId, organizationId);

  if (!prescription || prescription.trim() === '') {
    throw new AppError('Prescription description is required', 400);
  }

  return await repository.addPrescription(consultationId, prescription);
};

const removeDiagnosis = async (diagnosisId) => {
  return await repository.removeDiagnosis(diagnosisId);
};

const removeTreatment = async (treatmentId) => {
  return await repository.removeTreatment(treatmentId);
};

const removePrescription = async (prescriptionId) => {
  return await repository.removePrescription(prescriptionId);
};

const update = async (id, organizationId, data) => {
  const consultation = await getById(id, organizationId);

  // Validar datos médicos si se actualizan
  validateMedicalData(data);

  // Recalcular tarifa total si se actualiza
  if (data.consultationFee !== undefined || data.treatmentFee !== undefined) {
    const consultationFee = data.consultationFee !== undefined ? data.consultationFee : consultation.consultationFee;
    const treatmentFee = data.treatmentFee !== undefined ? data.treatmentFee : consultation.treatmentFee;
    data.totalFee = consultationFee + treatmentFee;
  }

  return await repository.update(id, organizationId, data);
};

const remove = async (id, organizationId) => {
  const consultation = await getById(id, organizationId);

  // Verificar si hay diagnósticos (restricción de negocio)
  if (consultation.diagnoses && consultation.diagnoses.length > 0) {
    throw new AppError('Cannot delete consultation with existing diagnoses', 409);
  }

  return await repository.remove(id, organizationId);
};

module.exports = {
  create,
  getAll,
  getById,
  getPetHistory,
  getClientConsultations,
  addDiagnosis,
  addTreatment,
  addPrescription,
  removeDiagnosis,
  removeTreatment,
  removePrescription,
  update,
  remove
};
