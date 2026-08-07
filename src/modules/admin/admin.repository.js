const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../core/errors/AppError');

/**
 * Convert a date to start of day in UTC (assuming input is UTC).
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Convert a date to end of day in UTC (exclusive).
 */
const endOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * Rango [start,end) del dia actual en la TZ indicada (placeholder UTC por ahora).
 */
const getDayRangeInTimezone = (timezone) => {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
};

/**
 * Lista las clinicas de una organizacion.
 * Mantenemos el contrato del modelo actual donde clinic.id == organization.id
 * para no introducir cambios de schema en T2; el caller sabe que la `id`
 * retornada representa el `clinicId` (que coincide numericamente con el
 * `organizationId`).
 */
const findClinicsByOrganization = async (organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: Number(organizationId) },
    select: { id: true, name: true },
  });
  if (!org) {
    throw new AppError('Organization not found', 404);
  }
  return [{ id: org.id, name: org.name, isDefault: true }];
};

const findClinicsWithMetrics = async (organizationId, timezone) => {
  const clinics = await findClinicsByOrganization(organizationId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const clinic = clinics[0];
  const metrics = await getClinicMetrics(clinic.id, todayStart, todayEnd);
  return [{ ...clinic, metrics }];
};

/**
 * Calcula metricas para una clinica en un rango de fechas.
 * Filtra por `clinicId` (no por `organizationId`).
 * @param {number} clinicId
 * @param {Date} start
 * @param {Date} end
 */
const getClinicMetrics = async (clinicId, start, end) => {
  const cId = Number(clinicId);

  const openConsultations = await prisma.consultation.count({
    where: { clinicId: cId, status: 'OPEN' },
  });

  const closedConsultationsToday = await prisma.consultation.count({
    where: {
      clinicId: cId,
      status: 'CLOSED',
      closedAt: { gte: start, lt: end },
    },
  });

  const activeClients = await prisma.client.count({
    where: { clinicId: cId, isActive: true },
  });

  const activePets = await prisma.pet.count({
    where: { client: { clinicId: cId, isActive: true } },
  });

  const salesResult = await prisma.sale.aggregate({
    where: {
      clinicId: cId,
      status: 'completed',
      createdAt: { gte: start, lt: end },
    },
    _sum: { total: true, tax: true },
    _count: true,
  });

  const salesTodayTotal = Number(salesResult._sum.total) || 0;
  const salesTodayTax = Number(salesResult._sum.tax) || 0;
  const salesTodayCount = Number(salesResult._count) || 0;
  const salesTodaySubtotal = salesTodayTotal - salesTodayTax;

  return {
    openConsultations,
    closedConsultationsToday,
    activeClients,
    activePets,
    today: {
      total: salesTodayTotal,
      tax: salesTodayTax,
      subtotal: salesTodaySubtotal,
      count: salesTodayCount,
    },
  };
};

const findUsersWithMetrics = async (organizationId) => {
  return await prisma.user.findMany({
    where: { organizationId: Number(organizationId) },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      created_at: true,
      clinics: { select: { id: true, name: true } },
    },
  });
}

const createUser = async (data) => {
  const { username, email, password, role, isActive, organizationId, clinicIds = [] } = data;
  const orgId = Number(organizationId);
  const userData = {
    username,
    email,
    password,
    role,
    isActive: isActive ?? true,
    organizationId: orgId,
  };
  let user;
  await prisma.$transaction(async (tx) => {
    user = await tx.users.create({ data: userData });
    if (clinicIds && clinicIds.length > 0) {
      const clinicIdNumbers = clinicIds.map(Number);
      await tx.users.update({
        where: { id: user.id },
        data: {
          clinics: { connect: clinicIdNumbers.map(id => ({ id })) },
        },
      });
    }
  });
  return user;
};

const updateUserClinics = async (userId, clinicIds) => {
  const clinicIdNumbers = clinicIds.map(Number);
  await prisma.user.update({
    where: { id: Number(userId) },
    data: {
      clinics: { set: clinicIdNumbers.map(id => ({ id })) },
    },
  });
};

module.exports = {
  findClinicsByOrganization,
  findClinicsWithMetrics,
  getClinicMetrics,
  findUsersWithMetrics,
  getDayRangeInTimezone,
  createUser,
  updateUserClinics,
};

