const repository = require('./subscription.repository');
const { AppError } = require('../../core/errors/AppError');

const PERIOD_MONTHS = Object.freeze({
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
});

const toMoneyString = (value, field) => {
  const raw = String(value ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new AppError(`${field} debe ser un importe válido`, 400, 'INVALID_MONEY');
  }
  return Number(raw).toFixed(2);
};

const toId = (value, field) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${field} inválido`, 400, 'INVALID_ID');
  }
  return id;
};

const serializeMoney = (value) => (value == null ? null : Number(value));

const serializePlan = (plan) => plan && ({
  ...plan,
  price: serializeMoney(plan.price),
  lateFeeValue: serializeMoney(plan.lateFeeValue),
});

const serializeInstallment = (installment) => installment && ({
  ...installment,
  amount: serializeMoney(installment.amount),
  lateFee: serializeMoney(installment.lateFee),
  totalAmount: serializeMoney(installment.totalAmount),
});

const validateLateFee = (data) => {
  const applyLateFee = Boolean(data.applyLateFee);
  const lateFeeType = applyLateFee ? data.lateFeeType : 'NONE';
  const lateFeeValue = toMoneyString(applyLateFee ? data.lateFeeValue : 0, 'lateFeeValue');
  if (lateFeeType === 'PERCENTAGE' && Number(lateFeeValue) > 100) {
    throw new AppError('La mora porcentual debe estar entre 0 y 100', 400, 'INVALID_LATE_FEE');
  }
  return { applyLateFee, lateFeeType, lateFeeValue };
};

const listPlans = async (clinicId, includeInactive) => (
  (await repository.findPlans(clinicId, includeInactive)).map(serializePlan)
);

const getPlan = async (id, clinicId) => {
  const plan = await repository.findPlanById(toId(id, 'planId'), clinicId);
  if (!plan) throw new AppError('Plan veterinario no encontrado', 404, 'MEDICAL_PLAN_NOT_FOUND');
  return serializePlan(plan);
};

const createPlan = async (data, clinicId) => {
  const fee = validateLateFee(data);
  const plan = await repository.createPlan({
    name: data.name.trim(),
    description: data.description || null,
    price: toMoneyString(data.price, 'price'),
    benefits: data.benefits,
    periodicity: data.periodicity,
    maxPets: data.maxPets,
    status: 'ACTIVE',
    ...fee,
  }, clinicId);
  return serializePlan(plan);
};

const updatePlan = async (id, data, clinicId) => {
  const planId = toId(id, 'planId');
  await getPlan(planId, clinicId);
  const update = { ...data };
  if (update.price !== undefined) update.price = toMoneyString(update.price, 'price');
  if (update.description === '') update.description = null;
  if (update.applyLateFee !== undefined || update.lateFeeType !== undefined || update.lateFeeValue !== undefined) {
    Object.assign(update, validateLateFee({
      applyLateFee: update.applyLateFee ?? false,
      lateFeeType: update.lateFeeType ?? 'NONE',
      lateFeeValue: update.lateFeeValue ?? 0,
    }));
  }
  delete update.status;
  const result = await repository.updatePlan(planId, clinicId, update);
  return serializePlan(result);
};

const setPlanStatus = async (id, status, clinicId) => {
  const planId = toId(id, 'planId');
  await getPlan(planId, clinicId);
  const result = await repository.updatePlan(planId, clinicId, { status });
  return serializePlan(result);
};

const refreshArrears = async (subscription, clinicId) => {
  const overdue = await repository.findInstallmentsBySubscription(
    subscription.id,
    clinicId,
    { status: 'PENDING', dueDate: { lt: new Date() } },
  );
  if (overdue.length >= 3 && subscription.status === 'ACTIVE') {
    await repository.refreshSubscription(subscription.id, clinicId, {
      status: 'SUSPENDED',
      suspensionReason: 'SUSPENDED_DUE_TO_ARREARS',
    });
    return { ...subscription, status: 'SUSPENDED', suspensionReason: 'SUSPENDED_DUE_TO_ARREARS' };
  }
  return subscription;
};

const calculateNextDueDate = (installments) => installments
  .filter((item) => item.status === 'PENDING')
  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]?.dueDate || null;

const getSubscriptionWithRefresh = async (id, clinicId) => {
  let subscription = await repository.findSubscriptionById(toId(id, 'subscriptionId'), clinicId);
  if (!subscription) throw new AppError('Suscripción no encontrada', 404, 'SUBSCRIPTION_NOT_FOUND');
  subscription = await refreshArrears(subscription, clinicId);
  return subscription;
};

const listSubscriptions = async (clinicId, filters = {}) => {
  const where = {};
  if (filters.clientId) where.clientId = toId(filters.clientId, 'clientId');
  if (filters.status) where.status = filters.status;
  const items = await repository.findSubscriptions(clinicId, where);
  return Promise.all(items.map((item) => refreshArrears(item, clinicId)));
};

const getSubscription = async (id, clinicId) => getSubscriptionWithRefresh(id, clinicId);

const createSubscription = async (data, clinicId) => {
  const clientId = toId(data.clientId, 'clientId');
  const planId = toId(data.medicalPlanId, 'medicalPlanId');
  const client = await repository.findClient(clientId, clinicId);
  if (!client) throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
  const plan = await repository.findPlanById(planId, clinicId);
  if (!plan) throw new AppError('Plan veterinario no encontrado', 404, 'MEDICAL_PLAN_NOT_FOUND');
  if (plan.status !== 'ACTIVE') throw new AppError('El plan veterinario no está activo', 400, 'MEDICAL_PLAN_INACTIVE');

  const petIds = [...new Set((data.petIds || []).map((petId) => toId(petId, 'petId')))];
  if (petIds.length > plan.maxPets) {
    throw new AppError('La cantidad de mascotas supera el máximo del plan', 400, 'PET_LIMIT_EXCEEDED');
  }
  const pets = await repository.findPets(petIds, clientId, clinicId);
  if (pets.length !== petIds.length) {
    throw new AppError('Una o más mascotas no pertenecen al cliente o a la clínica', 400, 'INVALID_SUBSCRIPTION_PETS');
  }

  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const subscription = await repository.createSubscription({
    data: {
      medicalPlanId: plan.id,
      clientId,
      clinicId,
      contractedPrice: plan.price,
      periodicity: plan.periodicity,
      startDate,
      nextDueDate: startDate,
      status: 'ACTIVE',
    },
    petIds,
  });
  return subscription;
};

const updateSubscription = async (id, data, clinicId) => {
  const subscription = await getSubscriptionWithRefresh(id, clinicId);
  const update = {};
  if (data.endDate !== undefined) update.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.status !== undefined) {
    if (data.status === 'ACTIVE' && subscription.status === 'SUSPENDED') {
      throw new AppError('La reactivación debe realizarse mediante la acción explícita de reactivar', 400, 'EXPLICIT_REACTIVATION_REQUIRED');
    }
    update.status = data.status;
  }
  if (data.suspensionReason !== undefined) update.suspensionReason = data.suspensionReason || null;
  await repository.updateSubscription(subscription.id, clinicId, update);
  return getSubscriptionWithRefresh(subscription.id, clinicId);
};

const addSubscriptionPet = async (subscriptionId, petId, clinicId) => {
  const subscription = await getSubscriptionWithRefresh(subscriptionId, clinicId);
  const plan = await repository.findPlanById(subscription.medicalPlanId, clinicId);
  const current = subscription.pets.map(({ pet }) => pet.id);
  if (current.includes(toId(petId, 'petId'))) return subscription;
  if (current.length >= plan.maxPets) throw new AppError('La cantidad de mascotas supera el máximo del plan', 400, 'PET_LIMIT_EXCEEDED');
  const pets = await repository.findPets([toId(petId, 'petId')], subscription.clientId, clinicId);
  if (pets.length !== 1) throw new AppError('La mascota no pertenece al cliente o a la clínica', 400, 'INVALID_SUBSCRIPTION_PET');
  await repository.addPet(subscription.id, pets[0].id);
  return getSubscriptionWithRefresh(subscription.id, clinicId);
};

const removeSubscriptionPet = async (subscriptionId, petId, clinicId) => {
  const subscription = await getSubscriptionWithRefresh(subscriptionId, clinicId);
  const result = await repository.removePet(subscription.id, toId(petId, 'petId'));
  if (!result.count) throw new AppError('La mascota no está asociada a la suscripción', 404, 'SUBSCRIPTION_PET_NOT_FOUND');
  return getSubscriptionWithRefresh(subscription.id, clinicId);
};

const suspendSubscription = async (id, reason, clinicId) => {
  const subscription = await getSubscriptionWithRefresh(id, clinicId);
  await repository.updateSubscription(subscription.id, clinicId, { status: 'SUSPENDED', suspensionReason: reason || 'SUSPENDED_MANUALLY' });
  return getSubscriptionWithRefresh(subscription.id, clinicId);
};

const reactivateSubscription = async (id, clinicId) => {
  const subscription = await getSubscriptionWithRefresh(id, clinicId);
  if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
    throw new AppError('No se puede reactivar una suscripción cancelada o expirada', 400, 'SUBSCRIPTION_NOT_REACTIVATABLE');
  }
  await repository.updateSubscription(subscription.id, clinicId, { status: 'ACTIVE', suspensionReason: null });
  return getSubscriptionWithRefresh(subscription.id, clinicId);
};

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const generateInstallments = async (subscriptionId, count, clinicId) => {
  const subscription = await getSubscriptionWithRefresh(subscriptionId, clinicId);
  if (subscription.status !== 'ACTIVE') throw new AppError('Solo se pueden generar cuotas de suscripciones activas', 400, 'SUBSCRIPTION_NOT_ACTIVE');
  const months = PERIOD_MONTHS[subscription.periodicity];
  const last = await repository.findLastInstallment(subscription.id, clinicId);
  let periodStart = last ? addDays(last.periodEnd, 1) : new Date(subscription.startDate);
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    const periodEnd = addDays(addMonths(periodStart, months), -1);
    rows.push({
      subscriptionId: subscription.id,
      clinicId,
      periodStart,
      periodEnd,
      dueDate: periodEnd,
      amount: subscription.contractedPrice,
      lateFee: '0.00',
      totalAmount: subscription.contractedPrice,
      status: 'PENDING',
    });
    periodStart = addDays(periodEnd, 1);
  }
  await repository.createInstallments(rows);
  const installments = await repository.findInstallmentsBySubscription(subscription.id, clinicId);
  await repository.refreshSubscription(subscription.id, clinicId, { nextDueDate: calculateNextDueDate(installments) });
  return installments.map(serializeInstallment);
};

const listInstallments = async ({ clientId, subscriptionId, installmentId, clinicId, status }) => {
  let items;
  if (installmentId) {
    const item = await repository.findInstallmentById(toId(installmentId, 'installmentId'), clinicId);
    if (!item) throw new AppError('Cuota no encontrada', 404, 'INSTALLMENT_NOT_FOUND');
    items = [item];
  } else if (subscriptionId) {
    await getSubscriptionWithRefresh(subscriptionId, clinicId);
    items = await repository.findInstallmentsBySubscription(toId(subscriptionId, 'subscriptionId'), clinicId, status ? { status } : {});
  } else {
    const client = await repository.findClient(toId(clientId, 'clientId'), clinicId);
    if (!client) throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
    items = await repository.findInstallmentsByClient(toId(clientId, 'clientId'), clinicId, status ? { status } : {});
  }
  return items.map(serializeInstallment);
};

const getClientSummary = async (clientId, clinicId) => {
  const client = await repository.findClient(toId(clientId, 'clientId'), clinicId);
  if (!client) throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
  const subscriptions = await repository.findSubscriptions(clinicId, { clientId: client.id });
  const current = subscriptions.find((item) => ['ACTIVE', 'SUSPENDED'].includes(item.status)) || subscriptions[0] || null;
  if (!current) return { clientId: client.id, subscription: null, installments: [], nextDueDate: null };
  const refreshed = await refreshArrears(current, clinicId);
  const installments = await repository.findInstallmentsBySubscription(refreshed.id, clinicId);
  return {
    clientId: client.id,
    subscription: refreshed,
    installments: installments.slice(0, 3).map(serializeInstallment),
    nextDueDate: calculateNextDueDate(installments),
  };
};

const monthlySummary = async (month, clinicId) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const [expected, collected, statuses] = await Promise.all([
    repository.monthlyInstallments(clinicId, start, end),
    repository.monthlyCollected(clinicId, start, end),
    repository.countSubscriptionsByStatus(clinicId),
  ]);
  const now = new Date();
  const expectedAmount = expected.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const collectedAmount = collected.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const pending = expected.filter((item) => item.status === 'PENDING');
  const overdue = pending.filter((item) => new Date(item.dueDate) < now);
  const countByStatus = Object.fromEntries(statuses.map((item) => [item.status, item._count._all]));
  return {
    month,
    expectedCount: expected.length,
    expectedAmount,
    collectedCount: collected.length,
    collectedAmount,
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, item) => sum + Number(item.totalAmount), 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((sum, item) => sum + Number(item.totalAmount), 0),
    collectionPercentage: expectedAmount ? Number(((collectedAmount / expectedAmount) * 100).toFixed(2)) : 0,
    activeSubscriptions: countByStatus.ACTIVE || 0,
    suspendedSubscriptions: countByStatus.SUSPENDED || 0,
    expiredSubscriptions: countByStatus.EXPIRED || 0,
    cancelledSubscriptions: countByStatus.CANCELLED || 0,
  };
};

const preparePos = async (data, clinicId) => {
  const clientId = toId(data.clientId, 'clientId');
  const installmentIds = [...new Set(data.installmentIds.map((item) => toId(item, 'installmentId')))];
  const client = await repository.findClient(clientId, clinicId);
  if (!client) throw new AppError('Cliente no encontrado', 404, 'CLIENT_NOT_FOUND');
  const installments = await repository.findInstallmentsByClient(
    clientId,
    clinicId,
    { id: { in: installmentIds }, status: 'PENDING' },
  );
  if (installments.length !== installmentIds.length) {
    throw new AppError('Una o más cuotas no están pendientes o no pertenecen al cliente', 409, 'INSTALLMENT_NOT_AVAILABLE');
  }
  const subscriptionIds = [...new Set(installments.map((item) => item.subscriptionId))];
  if (subscriptionIds.length !== 1) {
    throw new AppError('Las cuotas seleccionadas deben pertenecer a la misma suscripción', 400, 'MULTIPLE_SUBSCRIPTIONS_NOT_SUPPORTED');
  }
  const futureId = data.futureInstallmentId == null ? null : toId(data.futureInstallmentId, 'futureInstallmentId');
  const futureSelected = installments.filter((item) => new Date(item.dueDate) > new Date());
  if (futureSelected.length > 1) {
    throw new AppError('Solo se puede seleccionar una cuota futura por adelantado', 400, 'MULTIPLE_FUTURE_INSTALLMENTS');
  }
  if (futureId != null) {
    if (!installmentIds.includes(futureId)) throw new AppError('La cuota futura debe formar parte de las cuotas seleccionadas', 400, 'INVALID_FUTURE_INSTALLMENT');
    if (installments.filter((item) => item.id === futureId && new Date(item.dueDate) > new Date()).length !== 1) {
      throw new AppError('La cuota indicada como futura no es válida', 400, 'INVALID_FUTURE_INSTALLMENT');
    }
  }
  const subscription = installments[0].subscription;
  return {
    client: { id: client.id, name: client.name, documentId: client.documentId },
    subscriptionId: subscription.id,
    plan: subscription.medicalPlan,
    installmentIds,
    futureInstallmentId: futureId,
    installments: installments.map(serializeInstallment),
    total: installments.reduce((sum, item) => sum + Number(item.totalAmount), 0),
  };
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
  addSubscriptionPet,
  removeSubscriptionPet,
  suspendSubscription,
  reactivateSubscription,
  generateInstallments,
  listInstallments,
  getClientSummary,
  monthlySummary,
  preparePos,
};
