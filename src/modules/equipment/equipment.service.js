const repository = require('./equipment.repository');
const { AppError } = require('../../core/errors/AppError');

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) throw new AppError('Equipment not found', 404);
  return item;
};

const create = async (data, clinicId) => {
  const name = data.name.trim();
  if (await repository.findByName(name, clinicId)) throw new AppError('Equipment with this name already exists', 409, 'EQUIPMENT_NAME_EXISTS');
  try {
    return await repository.create({ name, description: data.description }, clinicId);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('Equipment with this name already exists', 409, 'EQUIPMENT_NAME_EXISTS');
    throw error;
  }
};

const getAll = (clinicId) => repository.findAll(clinicId);

const update = async (id, clinicId, data) => {
  await getById(id, clinicId);
  const updateData = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (await repository.findByName(name, clinicId, id)) throw new AppError('Equipment with this name already exists', 409, 'EQUIPMENT_NAME_EXISTS');
    updateData.name = name;
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  try {
    return await repository.update(id, updateData);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('Equipment with this name already exists', 409, 'EQUIPMENT_NAME_EXISTS');
    throw error;
  }
};

module.exports = { create, getAll, getById, update };
