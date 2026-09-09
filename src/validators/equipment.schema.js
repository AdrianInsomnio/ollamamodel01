const Joi = require('joi');

const equipmentBody = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(5000).allow('', null),
}).unknown(false);

const updateEquipmentBody = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(5000).allow('', null),
  isActive: Joi.boolean(),
}).min(1).unknown(false);

const equipmentParams = Joi.object({
  id: Joi.number().integer().positive().required(),
}).unknown(false);

module.exports = {
  createEquipmentSchema: equipmentBody,
  updateEquipmentSchema: updateEquipmentBody,
  equipmentIdSchema: equipmentParams,
};
