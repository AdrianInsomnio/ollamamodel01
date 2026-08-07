const repository = require('./service.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId) => {
  return await repository.create(data, clinicId);
};

const getAll = async (clinicId) => {
  return await repository.findAll(clinicId);
};

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) {
    throw new AppError('Service not found', 404);
  }
  return item;
};

const update = async (id, clinicId, data) => {
  await getById(id, clinicId);
  return await repository.update(id, clinicId, data);
};

const remove = async (id, clinicId) => {
  await getById(id, clinicId);
  return await repository.remove(id, clinicId);
};

module.exports = { create, getAll, getById, update, remove };
