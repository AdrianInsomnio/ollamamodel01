const { prisma } = require('../../lib/prisma');

const planInclude = {
  _count: { select: { clientSubscriptions: true } },
};

const subscriptionInclude = {
  medicalPlan: true,
  client: { select: { id: true, name: true, documentId: true } },
  pets: { include: { pet: true }, orderBy: { createdAt: 'asc' } },
  _count: { select: { installments: true } },
};

const installmentInclude = {
  subscription: {
    include: {
      medicalPlan: true,
      client: { select: { id: true, name: true, documentId: true } },
      pets: { include: { pet: true } },
    },
  },
  sale: { select: { id: true, status: true, createdAt: true } },
};

const findPlans = (clinicId, includeInactive = false) => prisma.medicalPlan.findMany({
  where: { clinicId, ...(includeInactive ? {} : { status: 'ACTIVE' }) },
  include: planInclude,
  orderBy: { name: 'asc' },
});

const findPlanById = (id, clinicId) => prisma.medicalPlan.findFirst({
  where: { id, clinicId },
  include: planInclude,
});

const createPlan = (data, clinicId) => prisma.medicalPlan.create({
  data: { ...data, clinicId },
  include: planInclude,
});

const updatePlan = async (id, clinicId, data) => {
  const updated = await prisma.medicalPlan.updateMany({
    where: { id, clinicId },
    data,
  });
  if (!updated.count) return null;
  return prisma.medicalPlan.findFirst({ where: { id, clinicId }, include: planInclude });
};

const findSubscriptions = (clinicId, where = {}) => prisma.clientSubscription.findMany({
  where: { clinicId, ...where },
  include: subscriptionInclude,
  orderBy: { createdAt: 'desc' },
});

const findSubscriptionById = (id, clinicId) => prisma.clientSubscription.findFirst({
  where: { id, clinicId },
  include: subscriptionInclude,
});

const findClient = (id, clinicId) => prisma.client.findFirst({ where: { id, clinicId } });

const findPets = (ids, clientId, clinicId) => prisma.pet.findMany({
  // Pet no tiene clinicId propio; el tenant se deriva del cliente.
  where: { id: { in: ids }, clientId, client: { clinicId } },
});

const createSubscription = ({ data, petIds }) => prisma.$transaction(async (tx) => {
  const subscription = await tx.clientSubscription.create({ data });
  if (petIds.length) {
    await tx.clientSubscriptionPet.createMany({
      data: petIds.map((petId) => ({ subscriptionId: subscription.id, petId })),
    });
  }
  return tx.clientSubscription.findUnique({
    where: { id: subscription.id },
    include: subscriptionInclude,
  });
});

const updateSubscription = (id, clinicId, data) => prisma.clientSubscription.updateMany({
  where: { id, clinicId },
  data,
});

const addPet = (subscriptionId, petId) => prisma.clientSubscriptionPet.create({
  data: { subscriptionId, petId },
  include: { pet: true },
});

const removePet = (subscriptionId, petId) => prisma.clientSubscriptionPet.deleteMany({
  where: { subscriptionId, petId },
});

const findInstallmentsBySubscription = (subscriptionId, clinicId, where = {}) => prisma.subscriptionInstallment.findMany({
  where: { subscriptionId, clinicId, ...where },
  include: installmentInclude,
  orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
});

const findInstallmentsByClient = (clientId, clinicId, where = {}) => prisma.subscriptionInstallment.findMany({
  where: {
    clinicId,
    subscription: { clientId },
    ...where,
  },
  include: installmentInclude,
  orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
});

const findInstallmentById = (id, clinicId) => prisma.subscriptionInstallment.findFirst({
  where: { id, clinicId },
  include: installmentInclude,
});

const findLastInstallment = (subscriptionId, clinicId) => prisma.subscriptionInstallment.findFirst({
  where: { subscriptionId, clinicId },
  orderBy: { periodEnd: 'desc' },
});

const createInstallments = (data) => prisma.subscriptionInstallment.createMany({
  data,
  skipDuplicates: true,
});

const refreshSubscription = (id, clinicId, data) => prisma.clientSubscription.updateMany({
  where: { id, clinicId },
  data,
});

const monthlyInstallments = (clinicId, start, end) => prisma.subscriptionInstallment.findMany({
  where: { clinicId, dueDate: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
  select: { status: true, dueDate: true, totalAmount: true, paidAt: true },
});

const monthlyCollected = (clinicId, start, end) => prisma.subscriptionInstallment.findMany({
  where: { clinicId, paidAt: { gte: start, lt: end }, status: 'PAID' },
  select: { totalAmount: true, paidAt: true },
});

const countSubscriptionsByStatus = (clinicId) => prisma.clientSubscription.groupBy({
  by: ['status'],
  where: { clinicId },
  _count: { _all: true },
});

module.exports = {
  findPlans,
  findPlanById,
  createPlan,
  updatePlan,
  findSubscriptions,
  findSubscriptionById,
  findClient,
  findPets,
  createSubscription,
  updateSubscription,
  addPet,
  removePet,
  findInstallmentsBySubscription,
  findInstallmentsByClient,
  findInstallmentById,
  findLastInstallment,
  createInstallments,
  refreshSubscription,
  monthlyInstallments,
  monthlyCollected,
  countSubscriptionsByStatus,
};
