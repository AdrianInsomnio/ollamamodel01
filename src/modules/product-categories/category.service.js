const repository = require('./category.repository');
const { AppError } = require('../../core/errors/AppError');

const getAll = (clinicId) => repository.findAll(clinicId);

const create = async (data, clinicId) => {
  if (!data.name || !data.name.trim()) throw new AppError('El nombre de la categoría es obligatorio', 400);
  return repository.create({ ...data, name: data.name.trim() }, clinicId);
};

const update = async (id, clinicId, data) => {
  const category = await repository.findById(id, clinicId);
  if (!category) throw new AppError('Categoría no encontrada', 404);
  if (data.name !== undefined && !data.name.trim()) throw new AppError('El nombre de la categoría es obligatorio', 400);
  return repository.update(id, clinicId, data);
};

const updateStatus = (id, clinicId, isActive) => update(id, clinicId, { isActive });

module.exports = { getAll, create, update, updateStatus };
