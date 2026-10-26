const repository = require('./service.repository');
const categoryRepository = require('../product-categories/category.repository');
const { AppError } = require('../../core/errors/AppError');

const validateServiceCategory = async (category, clinicId) => {
  if (!category) return;
  const match = await categoryRepository.findActiveByNameAndType(category, 'SERVICIO', clinicId);
  if (!match) throw new AppError('Selecciona una categoría activa clasificada como servicio', 400, 'CATEGORY_TYPE_MISMATCH');
};

const create = async (data, clinicId) => {
  if (!data.name || !data.name.trim()) throw new AppError('El nombre es obligatorio', 400);
  if (data.price === undefined || data.price === null || data.price < 0) throw new AppError('El precio no puede ser negativo y es obligatorio', 400);
  if (data.duration !== undefined && data.duration !== null && data.duration <= 0) throw new AppError('La duración debe ser mayor a cero', 400);
  await validateServiceCategory(data.category, clinicId);
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
  const currentService = await getById(id, clinicId);
  const editableFields = ['name', 'description', 'price', 'duration', 'category', 'isActive'];
  const updateData = Object.fromEntries(
    editableFields
      .filter((field) => Object.prototype.hasOwnProperty.call(data || {}, field))
      .map((field) => [field, data[field]])
  );
  if (data.name !== undefined && !data.name.trim()) throw new AppError('El nombre es obligatorio', 400);
  if (data.price !== undefined && data.price < 0) throw new AppError('El precio no puede ser negativo', 400);
  if (data.duration !== undefined && data.duration !== null && data.duration <= 0) throw new AppError('La duración debe ser mayor a cero', 400);
  if (Object.prototype.hasOwnProperty.call(data || {}, 'category') && data.category !== currentService.category) await validateServiceCategory(data.category, clinicId);
  return await repository.update(id, clinicId, updateData);
};

const remove = async (id, clinicId) => {
  await getById(id, clinicId);
  return await repository.remove(id, clinicId);
};

module.exports = { create, getAll, getById, update, remove };
