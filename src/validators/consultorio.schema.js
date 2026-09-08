const Joi = require('joi');

const idParam = Joi.number().integer().positive().required();

const consultorioBody = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(5000).allow('', null),
  size: Joi.string().trim().max(100).allow('', null),
}).unknown(false);

const updateConsultorioBody = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(5000).allow('', null),
  size: Joi.string().trim().max(100).allow('', null),
}).min(1).unknown(false);

const statusBody = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').required(),
}).unknown(false);

const consultorioParams = Joi.object({ id: idParam }).unknown(false);

const equipmentAssociationBody = Joi.object({
  equipmentId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
  status: Joi.string().valid('AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE').required(),
  notes: Joi.string().trim().max(5000).allow('', null),
}).unknown(false);

const updateEquipmentAssociationBody = Joi.object({
  quantity: Joi.number().integer().min(1),
  status: Joi.string().valid('AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'),
  notes: Joi.string().trim().max(5000).allow('', null),
}).min(1).unknown(false);

const equipmentAssociationParams = Joi.object({
  id: idParam,
  equipmentId: idParam,
}).unknown(false);

const availableQuery = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
}).unknown(false);

module.exports = {
  createConsultorioSchema: { body: consultorioBody },
  updateConsultorioSchema: { body: updateConsultorioBody, params: consultorioParams },
  updateConsultorioStatusSchema: { body: statusBody, params: consultorioParams },
  consultorioIdSchema: { params: consultorioParams },
  equipmentAssociationSchema: { body: equipmentAssociationBody, params: consultorioParams },
  updateEquipmentAssociationSchema: { body: updateEquipmentAssociationBody, params: equipmentAssociationParams },
  deleteEquipmentAssociationSchema: { params: equipmentAssociationParams },
  availableConsultoriosSchema: { query: availableQuery },
};
