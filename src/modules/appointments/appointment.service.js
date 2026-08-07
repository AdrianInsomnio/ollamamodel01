const repository = require('./appointment.repository');
const { AppError } = require('../../core/errors/AppError');
const { prisma } = require('../../lib/prisma');
const petRepository = require('../pets/pet.repository');
const clientRepository = require('../clients/client.repository');

const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

const create = async (data, clinicId) => {
  if (!data || typeof data !== 'object') {
    throw new AppError('Body required', 400);
  }
  if (!data.date) throw new AppError('Date is required', 400);
  if (!data.clientId || !isPositiveInt(Number(data.clientId))) {
    throw new AppError('Client is required', 400);
  }
  if (!data.petId || !isPositiveInt(Number(data.petId))) {
    throw new AppError('Pet is required', 400);
  }
  const date = new Date(data.date);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  if (date.getTime() < Date.now()) {
    throw new AppError('Appointment date cannot be in the past', 400);
  }
  if (data.duration !== undefined && (Number(data.duration) < 0)) {
    throw new AppError('Duration must be positive', 400);
  }

  const client = await clientRepository.findById(data.clientId, clinicId);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  const pet = await petRepository.findById(data.petId);
  if (!pet) {
    throw new AppError('Pet not found', 404);
  }
  if (pet.clientId !== Number(data.clientId)) {
    throw new AppError('Pet does not belong to this client', 400);
  }

  const isAvailable = await repository.checkAvailability(date, data.duration || 30, clinicId);
  if (!isAvailable) {
    throw new AppError('Time slot is not available', 409);
  }

  return await repository.create(data, clinicId);
};

const getAll = async (clinicId) => {
  return await repository.findAll(clinicId);
};

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) {
    throw new AppError('Appointment not found', 404);
  }
  return item;
};

const getAvailableSlots = async (date, clinicId) => {
  if (!date) {
    throw new AppError('Date is required', 400);
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  const dayStart = new Date(parsed);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(parsed);
  dayEnd.setHours(23, 59, 59, 999);

  const appointments = (await repository.findByDateRange(dayStart, dayEnd, clinicId)) || [];

  const workStart = 8;
  const workEnd = 17;
  const slotDuration = 30;

  const slots = [];
  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slotTime = new Date(parsed);
      slotTime.setHours(hour, minute, 0, 0);

      const isConflict = Array.isArray(appointments) && appointments.some(apt => {
        const aptDate = apt.date ? new Date(apt.date) : null;
        const aptDuration = apt.duration || 30;
        if (!aptDate) return false;
        const aptEnd = new Date(aptDate.getTime() + aptDuration * 60000);
        return slotTime < aptEnd && new Date(slotTime.getTime() + slotDuration * 60000) > aptDate;
      });

      if (!isConflict) {
        slots.push(slotTime);
      }
    }
  }

  return slots;
};

const updateStatus = async (id, clinicId, status) => {
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid appointment status', 400);
  }
  const item = await repository.update(id, clinicId, { status });
  if (!item) {
    throw new AppError('Appointment not found', 404);
  }
  return item;
};

const update = async (id, clinicId, data) => {
  if (data.duration !== undefined && Number(data.duration) < 0) {
    throw new AppError('Duration must be positive', 400);
  }
  if (data.date) {
    const newDate = new Date(data.date);
    if (Number.isNaN(newDate.getTime())) {
      throw new AppError('Invalid date', 400);
    }
    if (newDate.getTime() < Date.now()) {
      throw new AppError('Appointment date cannot be in the past', 400);
    }
  }
  const item = await repository.update(id, clinicId, data);
  if (!item) {
    throw new AppError('Appointment not found', 404);
  }
  return item;
};

const remove = async (id, clinicId) => {
  return await repository.remove(id, clinicId);
};

module.exports = {
  create,
  getAll,
  getById,
  getAvailableSlots,
  updateStatus,
  update,
  remove,
};