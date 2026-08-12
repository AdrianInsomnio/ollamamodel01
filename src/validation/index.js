// Exportar esquemas Joi comunes y específicos por módulo
// Los esquemas específicos se irán agregando a medida que se avance en las fases

const Joi = require('joi');

// Esquemas comunes
const idSchema = Joi.number().integer().positive().required();
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

module.exports = {
  Joi,
  idSchema,
  paginationSchema,
  // Esquemas por módulo se importarán aquí cuando se creen
  // Ejemplo: userSchema: require('./user.schema')
};
