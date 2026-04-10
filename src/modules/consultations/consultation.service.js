const repository = require('./consultation.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, organizationId) => {
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

const update = async (id, organizationId, data) => {
  await getById(id, organizationId);
  return await repository.update(id, organizationId, data);
};

module.exports = { create, getAll, getById, update };
