const repository = require('./service.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId) => {
  if (!data.name || !data.name.trim()) throw new AppError('El nombre es obligatorio', 400);
  if (data.price === undefined || data.price === null || data.price < 0) throw new AppError('El precio no puede ser negativo y es obligatorio', 400);
  if (data.duration !== undefined && data.duration !== null && data.duration <= 0) throw new AppError('La duración debe ser mayor a cero', 400);
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
  const editableFields = ['name', 'description', 'price', 'duration', 'category', 'isActive'];
  const updateData = Object.fromEntries(
    editableFields
      .filter((field) => Object.prototype.hasOwnProperty.call(data || {}, field))
      .map((field) => [field, data[field]])
  );
  if (data.name !== undefined && !data.name.trim()) throw new AppError('El nombre es obligatorio', 400);
  if (data.price !== undefined && data.price < 0) throw new AppError('El precio no puede ser negativo', 400);
  if (data.duration !== undefined && data.duration !== null && data.duration <= 0) throw new AppError('La duración debe ser mayor a cero', 400);
  return await repository.update(id, clinicId, updateData);
};

const remove = async (id, clinicId) => {
  await getById(id, clinicId);
  return await repository.remove(id, clinicId);
};

module.exports = { create, getAll, getById, update, remove };
