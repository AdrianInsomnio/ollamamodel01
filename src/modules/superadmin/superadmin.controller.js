const service = require('./superadmin.service');

const getPlans = async (req, res, next) => {
  try {
    const items = await service.getPlans(req.user.organizationId);
    res.json({ plans: items });
  } catch (error) {
    next(error);
  }
};

const getPlanById = async (req, res, next) => {
  try {
    const item = await service.getPlanById(parseInt(req.params.id), req.user.organizationId);
    res.json({ plan: item });
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const item = await service.createPlan(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    await service.updatePlan(parseInt(req.params.id), req.body, req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    await service.deletePlan(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getSubscriptions = async (req, res, next) => {
  try {
    const items = await service.getSubscriptions(req.user.organizationId);
    res.json({ subscriptions: items });
  } catch (error) {
    next(error);
  }
};

const getSubscriptionById = async (req, res, next) => {
  try {
    const item = await service.getSubscriptionById(parseInt(req.params.id), req.user.organizationId);
    res.json({ subscription: item });
  } catch (error) {
    next(error);
  }
};

const createSubscription = async (req, res, next) => {
  try {
    const item = await service.createSubscription(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    await service.updateSubscription(parseInt(req.params.id), req.body, req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deleteSubscription = async (req, res, next) => {
  try {
    await service.deleteSubscription(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getSubscriptionsByOrganization = async (req, res, next) => {
  try {
    const items = await service.getSubscriptionsByOrganization(req.user.organizationId);
    res.json({ subscriptions: items });
  } catch (error) {
    next(error);
  }
};

const createClinic = async (req, res, next) => {
  try {
    const item = await service.createClinic(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getClinicById = async (req, res, next) => {
  try {
    const item = await service.getClinicById(parseInt(req.params.id), req.user.organizationId);
    res.json({ clinic: item });
  } catch (error) {
    next(error);
  }
};

const getClinicsByOrganization = async (req, res, next) => {
  try {
    const items = await service.getClinicsByOrganization(req.user.organizationId);
    res.json({ clinics: items });
  } catch (error) {
    next(error);
  }
};

const updateClinic = async (req, res, next) => {
  try {
    await service.updateClinic(parseInt(req.params.id), req.body, req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const deleteClinic = async (req, res, next) => {
  try {
    await service.deleteClinic(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const associateClinicToPlan = async (req, res, next) => {
  try {
    const { clinicId, planId } = req.body;
    const item = await service.associateClinicToPlan(clinicId, planId, req.user.organizationId);
    res.json({ clinic: item });
  } catch (error) {
    next(error);
  }
};

const associateClinicToSubscription = async (req, res, next) => {
  try {
    const { clinicId, subscriptionId } = req.body;
    const item = await service.associateClinicToSubscription(clinicId, subscriptionId, req.user.organizationId);
    res.json({ clinic: item });
  } catch (error) {
    next(error);
  }
};  


module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByOrganization,
  createClinic,
  getClinicById,
  getClinicsByOrganization,
  updateClinic,
  deleteClinic,
  associateClinicToPlan,
  associateClinicToSubscription     
};
