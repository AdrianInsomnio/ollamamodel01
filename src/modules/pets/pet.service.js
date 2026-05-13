const repository = require('./pet.repository');
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
    throw new AppError('Pet not found', 404);
  }
  return item;
};

const update = async (id, organizationId, data) => {
  await getById(id, organizationId);
  return await repository.update(id, organizationId, data);
};

const remove = async (id, organizationId) => {
  await getById(id, organizationId);
  return await repository.remove(id, organizationId);
};

const getFullHistory = async (id, organizationId) => {
  const pet = await repository.getFullHistory(id, organizationId);
  if (!pet) {
    throw new AppError('Pet not found', 404);
  }

  // Calcular estadísticas
  const totalSpent = pet.sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalConsultations = pet.consultations.length;
  const totalAppointments = pet.appointments.length;

  // Calcular última visita
  const lastVisit = pet.consultations[0]?.createdAt || pet.appointments[0]?.date || null;

  return {
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate,
      weight: pet.weight,
      color: pet.color,
      microchip: pet.microchip,
      notes: pet.notes,
      isActive: pet.isActive
    },
    client: pet.client,
    stats: {
      totalSpent,
      totalConsultations,
      totalAppointments,
      lastVisit
    },
    consultations: pet.consultations,
    appointments: pet.appointments,
    sales: pet.sales
  };
};

module.exports = { create, getAll, getById, update, remove, getFullHistory };
