'use strict';
const petRepository = require('./pet.repository');
const clientRepository = require('../clients/client.repository');
const Joi = require('joi');
const { AppError } = require('../../core/errors/AppError');

const petCreateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  species: Joi.string().min(1).max(50).required(),
  breed: Joi.string().allow('').max(50).optional(),
  birthDate: Joi.date().iso().allow(null).optional(),
  birthDateEstimated: Joi.boolean().optional(),
  deathDate: Joi.date().iso().allow(null).optional(),
  weight: Joi.number().positive().precision(2).allow(null).optional(),
  color: Joi.string().allow('').max(30).optional(),
  microchip: Joi.string().allow('').max(50).optional(),
  notes: Joi.string().allow('').max(500).optional(),
  clientId: Joi.number().integer().positive().required(),
  clinicId: Joi.number().integer().positive().required(),
});

const petUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  species: Joi.string().min(1).max(50).optional(),
  breed: Joi.string().allow('').max(50).optional(),
  birthDate: Joi.date().iso().allow(null).optional(),
  birthDateEstimated: Joi.boolean().optional(),
  deathDate: Joi.date().iso().allow(null).optional(),
  weight: Joi.number().positive().precision(2).allow(null).optional(),
  color: Joi.string().allow('').max(30).optional(),
  microchip: Joi.string().allow('').max(50).optional(),
  notes: Joi.string().allow('').max(500).optional(),
  clientId: Joi.number().integer().positive().optional(),
  clinicId: Joi.number().integer().positive().optional(),
});

class PetService {
  async createPet(data) {
    const { error, value } = petCreateSchema.validate(data, { abortEarly: false });
    if (error) {
      const details = error.details.map(d => d.message).join('. ');
      throw new AppError('Datos de entrada invalidos: ' + details, 400);
    }
    // Verificar que el cliente exista y pertenezca al clinicId indicado.
    const client = await clientRepository.findById(value.clientId, value.clinicId);
    if (!client) {
      throw new AppError('Client not found in the specified clinic', 404);
    }
    return await petRepository.create(value, value.clinicId);
  }

  async getPetById(id, clinicId) {
    const pet = await petRepository.findById(Number(id));
    if (!pet) {
      throw new AppError('Pet not found', 404);
    }
    if (clinicId !== undefined && clinicId !== null) {
      const owner = await clientRepository.findById(pet.clientId, clinicId);
      if (!owner) {
        throw new AppError('Pet not found in the specified clinic', 404);
      }
    }
    return pet;
  }

  async getPets(filters, clinicId) {
    const where = { ...(filters || {}) };
    if (clinicId !== undefined && clinicId !== null) {
      where.clinicId = clinicId;
    }
    return await petRepository.findMany({ where });
  }

  async updatePet(id, data, clinicId) {
    await this.getPetById(id, clinicId);
    const { error, value } = petUpdateSchema.validate(data, { abortEarly: false });
    if (error) {
      const details = error.details.map(d => d.message).join('. ');
      throw new AppError('Datos de entrada invalidos: ' + details, 400);
    }
    if (value.clinicId && clinicId && value.clinicId !== clinicId) {
      throw new AppError('Cannot move pet to a different clinic', 403);
    }
    return await petRepository.update(id, value);
  }

  async deletePet(id, clinicId) {
    await this.getPetById(id, clinicId);
    return await petRepository.delete(id);
  }
}

module.exports = new PetService();
