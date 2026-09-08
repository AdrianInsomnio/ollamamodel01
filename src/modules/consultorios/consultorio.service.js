const repository = require('./consultorio.repository');
const equipmentRepository = require('../equipment/equipment.repository');
const { AppError } = require('../../core/errors/AppError');

const statuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
const equipmentStatuses = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'];

const normalizeName = (name) => name.trim();

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) throw new AppError('Consultorio not found', 404);
  return item;
};

const create = async (data, clinicId) => {
  const name = normalizeName(data.name);
  if (await repository.findByName(name, clinicId)) {
    throw new AppError('A consultorio with this name already exists', 409, 'CONSULTORIO_NAME_EXISTS');
  }
  try {
    return await repository.create({ name, description: data.description, size: data.size }, clinicId);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('A consultorio with this name already exists', 409, 'CONSULTORIO_NAME_EXISTS');
    }
    throw error;
  }
};

const getAll = (clinicId) => repository.findAll(clinicId);

const update = async (id, clinicId, data) => {
  await getById(id, clinicId);
  const updateData = {};
  if (data.name !== undefined) {
    const name = normalizeName(data.name);
    if (await repository.findByName(name, clinicId, id)) {
      throw new AppError('A consultorio with this name already exists', 409, 'CONSULTORIO_NAME_EXISTS');
    }
    updateData.name = name;
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.size !== undefined) updateData.size = data.size;
  try {
    return await repository.update(id, clinicId, updateData);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('A consultorio with this name already exists', 409, 'CONSULTORIO_NAME_EXISTS');
    }
    throw error;
  }
};

const updateStatus = async (id, clinicId, status) => {
  if (!statuses.includes(status)) throw new AppError('Invalid consultorio status', 400);
  await getById(id, clinicId);
  return repository.updateStatus(id, clinicId, status);
};

const getAvailable = async (clinicId, startAt, endAt) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new AppError('startAt must be before endAt', 400);
  }
  return repository.findAvailable(clinicId, start, end);
};

const addEquipment = async (consultorioId, clinicId, data) => {
  await getById(consultorioId, clinicId);
  const equipment = await equipmentRepository.findById(data.equipmentId, clinicId);
  if (!equipment) throw new AppError('Equipment not found', 404);
  if (!equipment.isActive) throw new AppError('Equipment is inactive', 400);
  if (!equipmentStatuses.includes(data.status)) throw new AppError('Invalid equipment status', 400);
  if (await repository.findEquipmentAssociation(consultorioId, data.equipmentId, clinicId)) {
    throw new AppError('Equipment is already associated with this consultorio', 409, 'EQUIPMENT_ASSOCIATION_EXISTS');
  }
  try {
    return await repository.createEquipmentAssociation(consultorioId, data.equipmentId, data);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Equipment is already associated with this consultorio', 409, 'EQUIPMENT_ASSOCIATION_EXISTS');
    }
    throw error;
  }
};

const updateEquipment = async (consultorioId, equipmentId, clinicId, data) => {
  const relation = await repository.findEquipmentAssociation(consultorioId, equipmentId, clinicId);
  if (!relation) throw new AppError('Equipment association not found', 404);
  if (data.status !== undefined && !equipmentStatuses.includes(data.status)) {
    throw new AppError('Invalid equipment status', 400);
  }
  const updateData = {};
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  return repository.updateEquipmentAssociation(relation.id, updateData);
};

const removeEquipment = async (consultorioId, equipmentId, clinicId) => {
  const relation = await repository.findEquipmentAssociation(consultorioId, equipmentId, clinicId);
  if (!relation) throw new AppError('Equipment association not found', 404);
  await repository.deleteEquipmentAssociation(relation.id);
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  updateStatus,
  getAvailable,
  addEquipment,
  updateEquipment,
  removeEquipment,
};
