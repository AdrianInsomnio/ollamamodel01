const repository = require('./category.repository');
const { AppError } = require('../../core/errors/AppError');

const CATEGORY_TYPES = ['PRODUCTO', 'SERVICIO', 'FARMACIA'];
const validateCategoryType = (type) => {
  if (!CATEGORY_TYPES.includes(type)) {
    throw new AppError(`El tipo de categoría debe ser uno de: ${CATEGORY_TYPES.join(', ')}`, 400, 'INVALID_CATEGORY_TYPE');
  }
};

const getAll = (clinicId) => repository.findAll(clinicId);

const create = async (data, clinicId) => {
  if (!data.name || !data.name.trim()) throw new AppError('El nombre de la categoría es obligatorio', 400);
  const type = data.type ?? 'PRODUCTO';
  validateCategoryType(type);
  return repository.create({ ...data, type, name: data.name.trim().toUpperCase() }, clinicId);
};

const update = async (id, clinicId, data) => {
  const category = await repository.findById(id, clinicId);
  if (!category) throw new AppError('Categoría no encontrada', 404);
  if (data.name !== undefined && !data.name.trim()) throw new AppError('El nombre de la categoría es obligatorio', 400);
  if (data.type !== undefined) validateCategoryType(data.type);
  return repository.update(id, clinicId, data);
};

const updateStatus = (id, clinicId, isActive) => update(id, clinicId, { isActive });

const getSubcategories = async (categoryId, clinicId) => {
  const category = await repository.findById(categoryId, clinicId);
  if (!category) throw new AppError('Categoría no encontrada', 404);
  return repository.findSubcategories(categoryId, clinicId);
};

const createSubcategory = async (categoryId, clinicId, data) => {
  const category = await repository.findById(categoryId, clinicId);
  if (!category || !category.isActive) throw new AppError('La categoría no está disponible', 400, 'CATEGORY_NOT_ACTIVE');
  if (!data.name || !data.name.trim()) throw new AppError('El nombre de la subcategoría es obligatorio', 400);
  return repository.createSubcategory({ name: data.name.trim().toUpperCase(), description: data.description ?? null }, categoryId, clinicId);
};

const updateSubcategory = async (id, categoryId, clinicId, data) => {
  const subcategory = await repository.findSubcategory(id, categoryId, clinicId);
  if (!subcategory) throw new AppError('Subcategoría no encontrada', 404);
  if (data.name !== undefined && !data.name.trim()) throw new AppError('El nombre de la subcategoría es obligatorio', 400);
  return repository.updateSubcategory(id, categoryId, clinicId, { ...data, ...(data.name !== undefined ? { name: data.name.trim().toUpperCase() } : {}) });
};

const updateSubcategoryStatus = (id, categoryId, clinicId, isActive) => updateSubcategory(id, categoryId, clinicId, { isActive });

module.exports = { getAll, create, update, updateStatus, getSubcategories, createSubcategory, updateSubcategory, updateSubcategoryStatus, CATEGORY_TYPES };
