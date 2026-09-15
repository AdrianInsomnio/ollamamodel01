const service = require('./subscription.service');
const { AppError } = require('../../core/errors/AppError');

const clinicIdFromRequest = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    const requested = req.query.clinicId ?? req.body?.clinicId;
    const clinicId = Number(requested);
    if (!Number.isInteger(clinicId) || clinicId <= 0) {
      throw new AppError('SUPER_ADMIN debe indicar clinicId para operar este recurso', 400, 'CLINIC_REQUIRED');
    }
    return clinicId;
  }
  if (!req.user.clinicId) throw new AppError('El usuario no tiene clínica asignada', 403, 'NO_CLINIC_ASSIGNED');
  return req.user.clinicId;
};

const id = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${name} inválido`, 400, 'INVALID_ID');
  return parsed;
};

const listPlans = async (req, res, next) => {
  try {
    const plans = await service.listPlans(clinicIdFromRequest(req), req.query.includeInactive === 'true');
    res.json({ plans });
  } catch (error) { next(error); }
};

const getPlan = async (req, res, next) => {
  try {
    const plan = await service.getPlan(req.params.id, clinicIdFromRequest(req));
    res.json({ plan });
  } catch (error) { next(error); }
};

const createPlan = async (req, res, next) => {
  try {
    const plan = await service.createPlan(req.body, clinicIdFromRequest(req));
    res.status(201).json({ plan });
  } catch (error) { next(error); }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await service.updatePlan(req.params.id, req.body, clinicIdFromRequest(req));
    res.json({ plan });
  } catch (error) { next(error); }
};

const setPlanStatus = async (req, res, next) => {
  try {
    const plan = await service.setPlanStatus(req.params.id, req.body.status, clinicIdFromRequest(req));
    res.json({ plan });
  } catch (error) { next(error); }
};

const listSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await service.listSubscriptions(clinicIdFromRequest(req), req.query);
    res.json({ subscriptions });
  } catch (error) { next(error); }
};

const getSubscription = async (req, res, next) => {
  try {
    const subscription = await service.getSubscription(req.params.id, clinicIdFromRequest(req));
    res.json({ subscription });
  } catch (error) { next(error); }
};

const createSubscription = async (req, res, next) => {
  try {
    const subscription = await service.createSubscription(req.body, clinicIdFromRequest(req));
    res.status(201).json({ subscription });
  } catch (error) { next(error); }
};

const updateSubscription = async (req, res, next) => {
  try {
    const subscription = await service.updateSubscription(req.params.id, req.body, clinicIdFromRequest(req));
    res.json({ subscription });
  } catch (error) { next(error); }
};

const addPet = async (req, res, next) => {
  try {
    const subscription = await service.addSubscriptionPet(req.params.id, req.params.petId, clinicIdFromRequest(req));
    res.json({ subscription });
  } catch (error) { next(error); }
};

const removePet = async (req, res, next) => {
  try {
    const subscription = await service.removeSubscriptionPet(req.params.id, req.params.petId, clinicIdFromRequest(req));
    res.json({ subscription });
  } catch (error) { next(error); }
};

const suspend = async (req, res, next) => {
  try {
    const subscription = await service.suspendSubscription(req.params.id, req.body.reason, clinicIdFromRequest(req));
    res.json({ subscription });
  } catch (error) { next(error); }
};

const reactivate = async (req, res, next) => {
  try {
    const subscription = await service.reactivateSubscription(req.params.id, clinicIdFromRequest(req));
    res.json({ subscription });
  } catch (error) { next(error); }
};

const generateInstallments = async (req, res, next) => {
  try {
    const installments = await service.generateInstallments(req.params.subscriptionId, req.body.count, clinicIdFromRequest(req));
    res.status(201).json({ installments });
  } catch (error) { next(error); }
};

const listInstallments = async (req, res, next) => {
  try {
    const installments = await service.listInstallments({
      clientId: req.params.clientId,
      subscriptionId: req.params.subscriptionId,
      installmentId: req.params.id,
      clinicId: clinicIdFromRequest(req),
      status: req.query.status,
    });
    res.json({ installments });
  } catch (error) { next(error); }
};

const clientSummary = async (req, res, next) => {
  try {
    const summary = await service.getClientSummary(req.params.clientId, clinicIdFromRequest(req));
    res.json({ summary });
  } catch (error) { next(error); }
};

const monthlySummary = async (req, res, next) => {
  try {
    const summary = await service.monthlySummary(req.query.month, clinicIdFromRequest(req));
    res.json({ summary });
  } catch (error) { next(error); }
};

const preparePos = async (req, res, next) => {
  try {
    const preparation = await service.preparePos(req.body, clinicIdFromRequest(req));
    res.json({ preparation });
  } catch (error) { next(error); }
};

module.exports = {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  setPlanStatus,
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  addPet,
  removePet,
  suspend,
  reactivate,
  generateInstallments,
  listInstallments,
  clientSummary,
  monthlySummary,
  preparePos,
};
