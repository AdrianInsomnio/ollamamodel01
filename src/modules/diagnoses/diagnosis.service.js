const repository = require('./diagnosis.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, organizationId) => {
  return await repository.create(data, organizationId);
};

const getByConsultationId = async (consultationId, organizationId) => {
  return await repository.findByConsultationId(consultationId, organizationId);
};

const remove = async (id, organizationId) => {
  const diagnosis = await repository.remove(id, organizationId);
  if (!diagnosis) {
    throw new AppError('Diagnosis not found', 404);
  }
  return diagnosis;
};

module.exports = { create, getByConsultationId, remove };
