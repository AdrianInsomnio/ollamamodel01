const Joi = require('joi');
const { AppError } = require('../../core/errors/AppError');

/**
 * Middleware de validación Joi
 * @param {Object} schema - Objeto Joi con las claves: body, query, params (opcionales)
 * @returns {Function} Middleware Express
 */
const validate = (schema) => (req, res, next) => {
  // Construir objeto de validación solo con las claves presentes en schema
  const validationObj = {};
  if (schema.body) validationObj.body = req.body;
  if (schema.query) validationObj.query = req.query;
  if (schema.params) validationObj.params = req.params;

  const schemaObj = Joi.object(validationObj);
  const { error } = schemaObj.validate(validationObj, { abortEarly: false, stripUnknown: true });

  if (error) {
    const details = error.details.map(detail => detail.message).join(', ');
    const err = new AppError(`Error de validación: ${details}`, 400, 'VALIDATION_ERROR');
    return next(err);
  }

  next();
};

module.exports = { validate };
