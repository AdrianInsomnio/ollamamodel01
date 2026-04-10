const repository = require('./prescription.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, organizationId) => {
  return await repository.create(data, organizationId);
};

const getByConsultationId = async (consultationId, organizationId) => {
  return await repository.findByConsultationId(consultationId, organizationId);
};

const remove = async (id, organizationId) => {
  const prescription = await repository.remove(id, organizationId);
  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }
  return prescription;
};

module.exports = { create, getByConsultationId, remove };
