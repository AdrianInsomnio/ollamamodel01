const Joi = require('joi');

const consultationParams = Joi.object({
  id: Joi.number().integer().positive().required(),
}).unknown(false);

const consultorioAssignmentBody = Joi.object({
  consultorioId: Joi.number().integer().positive().required(),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
}).unknown(false);

module.exports = {
  assignConsultorioSchema: consultorioAssignmentBody,
  consultationIdSchema: consultationParams,
};
