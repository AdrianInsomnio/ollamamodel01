const repository = require('./treatment.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, organizationId) => {
  return await repository.create(data, organizationId);
};

const getByConsultationId = async (consultationId, organizationId) => {
  return await repository.findByConsultationId(consultationId, organizationId);
};

const remove = async (id, organizationId) => {
  const treatment = await repository.remove(id, organizationId);
  if (!treatment) {
    throw new AppError('Treatment not found', 404);
  }
  return treatment;
};

module.exports = { create, getByConsultationId, remove };
