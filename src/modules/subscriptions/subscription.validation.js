const Joi = require('joi');

const id = Joi.number().integer().positive().required();
const money = Joi.alternatives().try(
  Joi.number().precision(2).min(0),
  Joi.string().pattern(/^\d+(\.\d{1,2})?$/),
).required();

const planBody = Joi.object({
  name: Joi.string().trim().min(1).max(191).required(),
  description: Joi.string().trim().max(191).allow('', null),
  price: money,
  benefits: Joi.any().required(),
  periodicity: Joi.string().valid('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL').required(),
  maxPets: Joi.number().integer().positive().required(),
  applyLateFee: Joi.boolean().default(false),
  lateFeeType: Joi.string().valid('NONE', 'FIXED', 'PERCENTAGE').default('NONE'),
  lateFeeValue: Joi.alternatives().try(
    Joi.number().precision(2).min(0),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/),
  ).default(0),
}).unknown(false);

const planUpdateBody = planBody.fork(
  ['name', 'description', 'price', 'benefits', 'periodicity', 'maxPets', 'applyLateFee', 'lateFeeType', 'lateFeeValue'],
  (schema) => schema.optional(),
).min(1);

const subscriptionBody = Joi.object({
  clientId: id,
  medicalPlanId: id,
  petIds: Joi.array().items(Joi.number().integer().positive()).unique().default([]),
  startDate: Joi.date().iso(),
}).unknown(false);

const subscriptionUpdateBody = Joi.object({
  endDate: Joi.date().iso().allow(null),
  status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'),
  suspensionReason: Joi.string().trim().max(191).allow('', null),
}).min(1).unknown(false);

const petParams = Joi.object({ id, petId: id }).unknown(false);
const singleIdParams = Joi.object({ id }).unknown(false);
const subscriptionIdParams = Joi.object({ subscriptionId: id }).unknown(false);
const clientIdParams = Joi.object({ clientId: id }).unknown(false);
const generateBody = Joi.object({ count: Joi.number().integer().min(1).max(24).default(1) }).unknown(false);
const preparePosBody = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  installmentIds: Joi.array().items(Joi.number().integer().positive()).min(1).unique().required(),
  futureInstallmentId: Joi.number().integer().positive().allow(null),
}).unknown(false);
const monthQuery = Joi.object({
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required(),
  clinicId: Joi.number().integer().positive(),
}).unknown(false);
const subscriptionQuery = Joi.object({
  clientId: Joi.number().integer().positive(),
  status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'),
}).unknown(false);
const installmentQuery = Joi.object({
  status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED'),
}).unknown(false);

module.exports = {
  planBody,
  planUpdateBody,
  subscriptionBody,
  subscriptionUpdateBody,
  petParams,
  singleIdParams,
  subscriptionIdParams,
  clientIdParams,
  generateBody,
  preparePosBody,
  monthQuery,
  subscriptionQuery,
  installmentQuery,
};
