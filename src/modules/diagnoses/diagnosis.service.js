const repository = require('./diagnosis.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId) => {
  return await repository.create(data, clinicId);
};

const getByConsultationId = async (consultationId, clinicId) => {
  return await repository.findByConsultationId(consultationId, clinicId);
};

const remove = async (id, clinicId) => {
  const diagnosis = await repository.remove(id, clinicId);
  if (!diagnosis) {
    throw new AppError('Diagnosis not found', 404);
  }
  return diagnosis;
};

module.exports = { create, getByConsultationId, remove };
