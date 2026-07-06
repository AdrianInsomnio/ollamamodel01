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

//codigo creado por Adrian

const createClinic = async (data, organizationId) => {
  return await prisma.clinic.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const getClinicById = async (id, organizationId) => {
  return await prisma.clinic.findUnique({
    where: { id: Number(id), organizationId }
  });
};

const getClinicsByOrganization = async (organizationId) => {
  return await prisma.clinic.findMany({
    where: { organizationId }
  });
};       
const updateClinic = async (id, data, organizationId) => {
  return await prisma.clinic.update({
    where: { id: Number(id), organizationId },
    data
  });
};

const deleteClinic = async (id, organizationId) => {
  return await prisma.clinic.delete({
    where: { id: Number(id), organizationId }
  });
};

const associateClinicToPlan = async (clinicId, planId, organizationId) => {
  return await prisma.clinic.update({
    where: { id: Number(clinicId), organizationId },
    data: {
      planId: Number(planId)
    }
  });
};

const associateClinicToSubscription = async (clinicId, subscriptionId, organizationId) => {
  return await prisma.clinic.update({
    where: { id: Number(clinicId), organizationId },
    data: {
      subscriptionId: Number(subscriptionId)
    }
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
  getSubscriptionsByOrganization,
  //
  createClinic,
  getClinicById,
  getClinicsByOrganization,
  updateClinic,
  deleteClinic,
  associateClinicToPlan,
  associateClinicToSubscription
};
