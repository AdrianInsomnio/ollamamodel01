const repository = require('./consultation.repository');
const petRepository = require('../pets/pet.repository');
const clientRepository = require('../clients/client.repository');
const appointmentRepository = require('../appointments/appointment.repository');
const saleService = require('../sales/sale.service');
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

const create = async (data, clinicId) => {
  // Validar campos requeridos
  if (!data.petId || !data.clientId) {
    throw new AppError('Pet and client are required', 400);
  }

  // Validar que la mascota existe
  const pet = await petRepository.findById(data.petId);
  if (!pet) {
    throw new AppError('Pet not found', 404);
  }

  // Validar que la mascota pertenece al cliente
  if (pet.clientId !== data.clientId) {
    throw new AppError('Pet does not belong to this client', 400);
  }

  // Validar que el cliente existe
  const client = await clientRepository.findById(data.clientId, clinicId);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Validar datos médicos
  validateMedicalData(data);

  // Si hay una cita asociada, validarla
  if (data.appointmentId) {
    const appointment = await appointmentRepository.findById(data.appointmentId, clinicId);
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

  return await repository.create(data, clinicId);
};

const getAll = async (clinicId) => {
  return await repository.findAll(clinicId);
};

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) {
    throw new AppError('Consultation not found', 404);
  }
  return item;
};

const getPetHistory = async (petId, clinicId) => {
  const consultations = await repository.findByPetId(petId, clinicId);
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

const getClientConsultations = async (clientId, clinicId) => {
  return await repository.findByClientId(clientId, clinicId);
};

const addDiagnosis = async (consultationId, clinicId, diagnosis) => {
  const consultation = await getById(consultationId, clinicId);

  if (!diagnosis || diagnosis.trim() === '') {
    throw new AppError('Diagnosis description is required', 400);
  }

  return await repository.addDiagnosis(consultationId, diagnosis);
};

const addTreatment = async (consultationId, clinicId, treatment) => {
  const consultation = await getById(consultationId, clinicId);

  if (!treatment || treatment.trim() === '') {
    throw new AppError('Treatment description is required', 400);
  }

  return await repository.addTreatment(consultationId, treatment);
};

const addPrescription = async (consultationId, clinicId, prescription) => {
  const consultation = await getById(consultationId, clinicId);

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

const update = async (id, clinicId, data) => {
  const consultation = await getById(id, clinicId);

  // Validar datos médicos si se actualizan
  validateMedicalData(data);

  // Recalcular tarifa total si se actualiza
  if (data.consultationFee !== undefined || data.treatmentFee !== undefined) {
    const consultationFee = data.consultationFee !== undefined ? data.consultationFee : consultation.consultationFee;
    const treatmentFee = data.treatmentFee !== undefined ? data.treatmentFee : consultation.treatmentFee;
    data.totalFee = consultationFee + treatmentFee;
  }

  return await repository.update(id, clinicId, data);
};

const remove = async (id, clinicId) => {
  const consultation = await getById(id, clinicId);

  // Verificar si hay diagnósticos (restricción de negocio)
  if (consultation.diagnoses && consultation.diagnoses.length > 0) {
    throw new AppError('Cannot delete consultation with existing diagnoses', 409);
  }

  return await repository.remove(id, clinicId);
};

const close = async (id, clinicId, closeData) => {
  const { items, paymentMethod, discount = 0 } = closeData;

  // Validar que la consulta existe
  const consultation = await getById(id, clinicId);

  // Validar que la consulta está abierta
  if (consultation.status !== 'OPEN') {
    throw new AppError('Consultation is not open', 400);
  }

  // Validar items
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items are required', 400);
  }

  // Validar método de pago
  if (!paymentMethod) {
    throw new AppError('Payment method is required', 400);
  }

  // Crear la venta usando saleService
  const saleData = {
    clientId: consultation.clientId,
    petId: consultation.petId,
    consultationId: id,
    items,
    discount,
    paymentMethod
  };

  const sale = await saleService.createSale(saleData, clinicId);

  // Cerrar la consulta
  const closedConsultation = await repository.updateStatus(id, 'CLOSED', new Date());

  // Preparar datos para impresión (ticket 80mm)
  const printData = {
    type: 'thermal_80mm',
    client: {
      name: consultation.client.name,
      documentId: consultation.client.documentId,
      phone: consultation.client.phone
    },
    pet: {
      name: consultation.pet.name,
      species: consultation.pet.species,
      breed: consultation.pet.breed
    },
    consultation: {
      id: consultation.id,
      date: consultation.createdAt
    },
    items: sale.items.map(item => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      price: item.priceSnapshot,
      subtotal: item.subtotal
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    saleId: sale.id
  };

  return {
    consultation: closedConsultation,
    sale,
    printData
  };
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
  remove,
  close
};
