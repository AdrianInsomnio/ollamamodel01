const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../core/errors/AppError');

const assertOrganization = async (entity, organizationId, label) => {
  if (entity.organizationId !== Number(organizationId)) {
    throw new AppError(`${label} not found in organization`, 404, 'NOT_FOUND');
  }
  return entity;
};

const getPlans = async (organizationId) => {
  return await prisma.plan.findMany({ where: { organizationId: Number(organizationId) } });
};

const getPlanById = async (id, organizationId) => {
  const plan = await prisma.plan.findUnique({ where: { id: Number(id) } });
  if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');
  return assertOrganization(plan, organizationId, 'Plan');
};

const createPlan = async (data, organizationId) => {
  return await prisma.plan.create({ data: { ...data, organizationId: Number(organizationId) } });
};

const updatePlan = async (id, data, organizationId) => {
  await getPlanById(id, organizationId);
  return await prisma.plan.update({ where: { id: Number(id) }, data });
};

const deletePlan = async (id, organizationId) => {
  await getPlanById(id, organizationId);
  return await prisma.plan.delete({ where: { id: Number(id) } });
};

const getSubscriptions = async (organizationId) => {
  return await prisma.subscription.findMany({
    where: { organizationId: Number(organizationId) },
  });
};

const getSubscriptionById = async (id, organizationId) => {
  const sub = await prisma.subscription.findUnique({ where: { id: Number(id) } });
  if (!sub) throw new AppError('Subscription not found', 404, 'NOT_FOUND');
  return assertOrganization(sub, organizationId, 'Subscription');
};

const createSubscription = async (data, organizationId) => {
  return await prisma.subscription.create({
    data: { ...data, organizationId: Number(organizationId) },
  });
};

const updateSubscription = async (id, data, organizationId) => {
  await getSubscriptionById(id, organizationId);
  return await prisma.subscription.update({ where: { id: Number(id) }, data });
};

const deleteSubscription = async (id, organizationId) => {
  await getSubscriptionById(id, organizationId);
  return await prisma.subscription.delete({ where: { id: Number(id) } });
};

const getSubscriptionsByOrganization = async (organizationId) => {
  return await prisma.subscription.findMany({
    where: { organizationId: Number(organizationId) },
  });
};

const createClinic = async (data, organizationId) => {
  return await prisma.clinics.create({
    data: { ...data, organizationId: Number(organizationId) },
  });
};

const getClinicById = async (id, organizationId) => {
  const clinic = await prisma.clinics.findUnique({ where: { id: Number(id) } });
  if (!clinic) throw new AppError('Clinic not found', 404, 'NOT_FOUND');
  return assertOrganization(clinic, organizationId, 'Clinic');
};

const getClinicsByOrganization = async (organizationId) => {
  return await prisma.clinics.findMany({
    where: { organizationId: Number(organizationId) },
  });
};

const updateClinic = async (id, data, organizationId) => {
  await getClinicById(id, organizationId);
  return await prisma.clinics.update({ where: { id: Number(id) }, data });
};

const deleteClinic = async (id, organizationId) => {
  await getClinicById(id, organizationId);
  return await prisma.clinics.delete({ where: { id: Number(id) } });
};

const associateClinicToPlan = async (clinicId, planId, organizationId) => {
  await getClinicById(clinicId, organizationId);
  await getPlanById(planId, organizationId);
  return await prisma.clinics.update({
    where: { id: Number(clinicId) },
    data: { planId: Number(planId) },
  });
};

const associateClinicToSubscription = async (clinicId, subscriptionId, organizationId) => {
  await getClinicById(clinicId, organizationId);
  await getSubscriptionById(subscriptionId, organizationId);
  return await prisma.clinics.update({
    where: { id: Number(clinicId) },
    data: { subscriptionId: Number(subscriptionId) },
  });
};

const createOrganization = async (data) => {
  return await prisma.organization.create({ data });
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
  associateClinicToSubscription,
  createOrganization,
};

