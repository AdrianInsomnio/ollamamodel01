const repository = require('./treatment.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId) => {
  return await repository.create(data, clinicId);
};

const getByConsultationId = async (consultationId, clinicId) => {
  return await repository.findByConsultationId(consultationId, clinicId);
};

const remove = async (id, clinicId) => {
  const treatment = await repository.remove(id, clinicId);
  if (!treatment) {
    throw new AppError('Treatment not found', 404);
  }
  return treatment;
};

module.exports = { create, getByConsultationId, remove };
