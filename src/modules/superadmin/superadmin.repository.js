const { prisma } = require('../../lib/prisma');

const getPlans = async (organizationId) => {
  return await prisma.plan.findMany({
    where: { organizationId }
  });
};

const getPlanById = async (id, organizationId) => {
  return await prisma.plan.findUnique({
    where: { id: Number(id), organizationId }
  });
};

const createPlan = async (data, organizationId) => {
  return await prisma.plan.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const updatePlan = async (id, data, organizationId) => {
  return await prisma.plan.update({
    where: { id: Number(id), organizationId },
    data
  });
};

const deletePlan = async (id, organizationId) => {
  return await prisma.plan.delete({
    where: { id: Number(id), organizationId }
  });
};

const getSubscriptions = async (organizationId) => {
  return await prisma.subscription.findMany({
    where: { organizationId }
  });
};

const getSubscriptionById = async (id, organizationId) => {
  return await prisma.subscription.findUnique({
    where: { id: Number(id), organizationId }
  });
};

const createSubscription = async (data, organizationId) => {
  return await prisma.subscription.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const updateSubscription = async (id, data, organizationId) => {
  return await prisma.subscription.update({
    where: { id: Number(id), organizationId },
    data
  });
};

const deleteSubscription = async (id, organizationId) => {
  return await prisma.subscription.delete({
    where: { id: Number(id), organizationId }
  });
};

const getSubscriptionsByOrganization = async (organizationId) => {
  return await prisma.subscription.findMany({
    where: { organizationId }
  });
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
