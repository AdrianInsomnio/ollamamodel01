const repository = require('./supplier.repository');
const { AppError } = require('../../core/errors/AppError');

const optionalText = (value, field) => {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  if (typeof value !== 'string') throw new AppError(`${field} debe ser texto`, 400, 'INVALID_SUPPLIER_FIELD');
  return value.trim();
};

const normalize = (data, partial = false) => {
  const result = {};
  if (!partial || Object.prototype.hasOwnProperty.call(data, 'name')) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('El nombre del proveedor es obligatorio', 400, 'SUPPLIER_NAME_REQUIRED');
    }
    result.name = data.name.trim();
  }
  for (const [input, field] of [
    ['rut', 'RUT'],
    ['contactName', 'Contacto'],
    ['phone', 'Teléfono'],
    ['email', 'Correo electrónico'],
    ['address', 'Dirección'],
    ['notes', 'Observaciones'],
  ]) {
    if (Object.prototype.hasOwnProperty.call(data, input)) result[input] = optionalText(data[input], field);
  }
  return result;
};

const list = (clinicId, activeOnly) => repository.findAll(clinicId, activeOnly);

const requireId = (id) => {
  if (!Number.isInteger(id) || id < 1) throw new AppError('Identificador de proveedor no válido', 400, 'INVALID_SUPPLIER_ID');
};

const create = async (data, clinicId) => {
  const normalized = normalize(data || {});
  if (await repository.findDuplicate({ clinicId, name: normalized.name, rut: normalized.rut })) {
    throw new AppError('Ya existe un proveedor con ese nombre o RUT en esta clínica', 409, 'SUPPLIER_ALREADY_EXISTS');
  }
  try {
    return await repository.create({ ...normalized, clinicId });
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('Ya existe un proveedor con ese nombre o RUT en esta clínica', 409, 'SUPPLIER_ALREADY_EXISTS');
    throw error;
  }
};

const update = async (id, clinicId, data) => {
  requireId(id);
  const supplier = await repository.findById(id, clinicId);
  if (!supplier) throw new AppError('Proveedor no encontrado', 404, 'SUPPLIER_NOT_FOUND');
  const normalized = normalize(data || {}, true);
  if (Object.keys(normalized).length) {
    const candidateName = Object.prototype.hasOwnProperty.call(normalized, 'name') ? normalized.name : supplier.name;
    const candidateRut = Object.prototype.hasOwnProperty.call(normalized, 'rut') ? normalized.rut : supplier.rut;
    if (await repository.findDuplicate({ clinicId, name: candidateName, rut: candidateRut, exceptId: id })) {
      throw new AppError('Ya existe un proveedor con ese nombre o RUT en esta clínica', 409, 'SUPPLIER_ALREADY_EXISTS');
    }
  }
  try {
    return await repository.update(id, clinicId, normalized);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('Ya existe un proveedor con ese nombre o RUT en esta clínica', 409, 'SUPPLIER_ALREADY_EXISTS');
    throw error;
  }
};

const updateStatus = async (id, clinicId, isActive) => {
  requireId(id);
  const supplier = await repository.findById(id, clinicId);
  if (!supplier) throw new AppError('Proveedor no encontrado', 404, 'SUPPLIER_NOT_FOUND');
  if (typeof isActive !== 'boolean') throw new AppError('El estado debe ser booleano', 400, 'INVALID_SUPPLIER_STATUS');
  return repository.update(id, clinicId, { isActive });
};

module.exports = { list, create, update, updateStatus };
