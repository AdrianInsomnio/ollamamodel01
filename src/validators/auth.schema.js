const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rememberMe: Joi.boolean().optional(),
});

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('ADMIN', 'VET', 'USER').default('USER'),
  clinicIds: Joi.array().items(Joi.number().integer().positive()).min(1).unique().required(),
});

const bootstrapSuperAdminSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  organizationName: Joi.string().min(2).max(100).required(),
  clinicName: Joi.string().min(2).max(100).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = { loginSchema, registerSchema, bootstrapSuperAdminSchema, changePasswordSchema };
