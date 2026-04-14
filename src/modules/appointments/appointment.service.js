const repository = require('./appointment.repository');
const petRepository = require('../pets/pet.repository');
const clientRepository = require('../clients/client.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, organizationId) => {
  // Validar campos requeridos
  if (!data.date || !data.petId || !data.clientId) {
    throw new AppError('Date, pet and client are required', 400);
  }

  // Validar que la fecha no sea pasado
  if (new Date(data.date) < new Date()) {
    throw new AppError('Appointment date cannot be in the past', 400);
  }

  // Validar que la mascota existe
  const pet = await petRepository.findById(data.petId, organizationId);
  if (!pet) {
    throw new AppError('Pet not found', 404);
  }

  // Validar que la mascota pertenece al cliente
  if (pet.clientId !== data.clientId) {
    throw new AppError('Pet does not belong to this client', 400);
  }

  // Validar que el cliente existe
  const client = await clientRepository.findById(data.clientId, organizationId);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Validar que no hay sobreposición de citas
  const isAvailable = await repository.checkAvailability(new Date(data.date), data.duration || 30, organizationId);
  if (!isAvailable) {
    throw new AppError('Time slot is not available', 409);
  }

  return await repository.create(data, organizationId);
};

const getAll = async (organizationId) => {
  return await repository.findAll(organizationId);
};

const getById = async (id, organizationId) => {
  const item = await repository.findById(id, organizationId);
  if (!item) {
    throw new AppError('Appointment not found', 404);
  }
  return item;
};

const getAvailableSlots = async (date, organizationId) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const appointments = await repository.findByDateRange(dayStart, dayEnd, organizationId);

  // Horario de atención: 8:00 - 17:00
  const workStart = 8;
  const workEnd = 17;
  const slotDuration = 30; // minutos

  const slots = [];
  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, minute, 0, 0);

      const isConflict = appointments.some(apt => {
        const aptEnd = new Date(apt.date.getTime() + apt.duration * 60000);
        return slotTime < aptEnd && new Date(slotTime.getTime() + slotDuration * 60000) > apt.date;
      });

      if (!isConflict) {
        slots.push(slotTime);
      }
    }
  }

  return slots;
};

const updateStatus = async (id, organizationId, status) => {
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid appointment status', 400);
  }

  const appointment = await getById(id, organizationId);
  return await repository.update(id, organizationId, { status });
};

const update = async (id, organizationId, data) => {
  const appointment = await getById(id, organizationId);

  // Validar fecha si se actualiza
  if (data.date && new Date(data.date) < new Date()) {
    throw new AppError('Appointment date cannot be in the past', 400);
  }

  // Validar disponibilidad si cambia la hora
  if (data.date || data.duration) {
    const newDate = new Date(data.date || appointment.date);
    const newDuration = data.duration || appointment.duration;
    const isAvailable = await repository.checkAvailability(newDate, newDuration, organizationId);
    if (!isAvailable) {
      throw new AppError('New time slot is not available', 409);
    }
  }

  return await repository.update(id, organizationId, data);
};

const remove = async (id, organizationId) => {
  await getById(id, organizationId);
  return await repository.remove(id, organizationId);
};

module.exports = {
  create,
  getAll,
  getById,
  getAvailableSlots,
  updateStatus,
  update,
  remove
};
