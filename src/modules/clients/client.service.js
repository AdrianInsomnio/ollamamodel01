const repository = require('./client.repository');
const { AppError } = require('../../core/errors/AppError');

// Validar formato de email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar formato de teléfono
const isValidPhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone);
};

const create = async (data, clinicId) => {
  // Validar campos requeridos
  if (!data.name || data.name.trim() === '') {
    throw new AppError('Client name is required', 400);
  }

  // Validar email si se proporciona
  if (data.email && !isValidEmail(data.email)) {
    throw new AppError('Invalid email format', 400);
  }

  // Validar email único
  if (data.email) {
    const existingEmail = await repository.findByEmail(data.email, clinicId);
    if (existingEmail) {
      throw new AppError('Email already in use', 400);
    }
  }

  // Validar teléfono si se proporciona
  if (data.phone && !isValidPhone(data.phone)) {
    throw new AppError('Invalid phone format', 400);
  }

  // Validar documentId único
  if (data.documentId) {
    const existingDoc = await repository.findByDocumentId(data.documentId, clinicId);
    if (existingDoc) {
      throw new AppError('Document ID already in use', 400);
    }
  }

  return await repository.create(data, clinicId);
};

const getAll = async (clinicId) => {
  return await repository.findAll(clinicId);
};

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) {
    throw new AppError('Client not found', 404);
  }
  return item;
};

const getClientHistory = async (id, clinicId) => {
  const client = await repository.getClientHistory(id, clinicId);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  return {
    ...client,
    stats: {
      totalPets: client.pets.length,
      totalSales: client.sales.length,
      totalAppointments: client.appointments.length,
      totalSpent: client.sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    }
  };
};

const update = async (id, clinicId, data) => {
  await getById(id, clinicId);

  // Validar email si se actualiza
  if (data.email) {
    if (!isValidEmail(data.email)) {
      throw new AppError('Invalid email format', 400);
    }
    const existingEmail = await repository.findByEmail(data.email, clinicId);
    if (existingEmail && existingEmail.id !== id) {
      throw new AppError('Email already in use', 400);
    }
  }

  // Validar teléfono si se actualiza
  if (data.phone && !isValidPhone(data.phone)) {
    throw new AppError('Invalid phone format', 400);
  }

  return await repository.update(id, clinicId, data);
};

const remove = async (id, clinicId) => {
  await getById(id, clinicId);
  return await repository.remove(id, clinicId);
};

const search = async (query, clinicId) => {
  if (!query || query.trim() === '') {
    throw new AppError('Search query is required', 400);
  }
  return await repository.search(query.trim(), clinicId);
};

const createWithPet = async (data, clinicId) => {
  // Validar campos requeridos del cliente
  if (!data.name || data.name.trim() === '') {
    throw new AppError('Client name is required', 400);
  }

  // Validar teléfono si se proporciona
  if (data.phone && !isValidPhone(data.phone)) {
    throw new AppError('Invalid phone format', 400);
  }

  // Validar email si se proporciona
  if (data.email && !isValidEmail(data.email)) {
    throw new AppError('Invalid email format', 400);
  }

  // Validar campos requeridos de la mascota
  if (!data.pet || !data.pet.name || data.pet.name.trim() === '') {
    throw new AppError('Pet name is required', 400);
  }

  if (!data.pet.species || data.pet.species.trim() === '') {
    throw new AppError('Pet species is required', 400);
  }

  // Validar email único
  if (data.email) {
    const existingEmail = await repository.findByEmail(data.email, clinicId);
    if (existingEmail) {
      throw new AppError('Email already in use', 400);
    }
  }

  // Validar documentId único
  if (data.documentId) {
    const existingDoc = await repository.findByDocumentId(data.documentId, clinicId);
    if (existingDoc) {
      throw new AppError('Document ID already in use', 400);
    }
  }

  const { pet, ...clientData } = data;
  return await repository.createWithPet(clientData, pet, clinicId);
};

module.exports = {
  create,
  getAll,
  getById,
  getClientHistory,
  update,
  remove,
  search,
  createWithPet
};
