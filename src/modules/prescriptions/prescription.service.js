const repository = require('./prescription.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId) => {
  return await repository.create(data, clinicId);
};

const getByConsultationId = async (consultationId, clinicId) => {
  return await repository.findByConsultationId(consultationId, clinicId);
};

const remove = async (id, clinicId) => {
  const prescription = await repository.remove(id, clinicId);
  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }
  return prescription;
};

module.exports = { create, getByConsultationId, remove };
