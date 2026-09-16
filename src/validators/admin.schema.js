const Joi = require('joi');

const clinicIds = Joi.array()
  .items(Joi.number().integer().positive())
  .min(1)
  .unique();

const adminUserCreateSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('ADMIN', 'VET', 'USER', 'SUPER_ADMIN').required(),
  isActive: Joi.boolean().default(true),
  clinicIds: clinicIds.optional(),
});

const adminUserUpdateSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50),
  email: Joi.string().email(),
  password: Joi.string().min(8).max(128).allow(''),
  role: Joi.string().valid('ADMIN', 'VET', 'USER', 'SUPER_ADMIN'),
  isActive: Joi.boolean(),
}).min(1);

const updateUserClinicsSchema = Joi.object({
  clinicIds: clinicIds.required(),
});

module.exports = {
  adminUserCreateSchema,
  adminUserUpdateSchema,
  updateUserClinicsSchema,
};
