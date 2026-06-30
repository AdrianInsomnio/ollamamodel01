const repository = require('./superadmin.repository');
const { AppError } = require('../../core/errors/AppError');

const getPlans = async (organizationId) => {
  return await repository.getPlans(organizationId);
};

const getPlanById = async (id, organizationId) => {
  const plan = await repository.getPlanById(id, organizationId);
  if (!plan) {
    throw new AppError('Plan not found', 404);
  }
  return plan;
};

const createPlan = async (data, organizationId) => {
  // data should include organizationId? but we pass separately
  return await repository.createPlan(data, organizationId);
};

const updatePlan = async (id, data, organizationId) => {
  // Ensure plan exists
  await getPlanById(id, organizationId);
  return await repository.updatePlan(id, data, organizationId);
};

const deletePlan = async (id, organizationId) => {
  // Ensure exists
  await getPlanById(id, organizationId);
  return await repository.deletePlan(id, organizationId);
};

const getSubscriptions = async (organizationId) => {
  return await repository.getSubscriptions(organizationId);
};

const getSubscriptionById = async (id, organizationId) => {
  const subscription = await repository.getSubscriptionById(id, organizationId);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }
  return subscription;
};

const createSubscription = async (data, organizationId) => {
  return await repository.createSubscription(data, organizationId);
};

const updateSubscription = async (id, data, organizationId) => {
  await getSubscriptionById(id, organizationId);
  return await repository.updateSubscription(id, data, organizationId);
};

const deleteSubscription = async (id, organizationId) => {
  await getSubscriptionById(id, organizationId);
  return await repository.deleteSubscription(id, organizationId);
};

const getSubscriptionsByOrganization = async (organizationId) => {
  return await repository.getSubscriptionsByOrganization(organizationId);
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
  getSubscriptionsByOrganization
};
