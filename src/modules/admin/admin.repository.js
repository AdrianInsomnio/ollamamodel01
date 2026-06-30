const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../core/errors/AppError');

/**
 * Convert a date to start of day in UTC (assuming input is UTC).
 * Returns a Date object at 00:00:00.000Z.
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Convert a date to end of day in UTC (exclusive).
 * Returns a Date object at 23:59:59.999Z.
 */
const endOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * Find clinics for an organization.
 * Since there is no Clinic entity, we treat the organization as a single clinic.
 * @param {number} organizationId
 * @returns {Promise<Array<{id:number, name:string, isDefault:boolean}>>}
 */
const findClinicsByOrganization = async (organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    throw new AppError('Organization not found', 404);
  }
  // Assume the organization's clinic is default
  return [{ id: org.id, name: org.name, isDefault: true }];
};

/**
 * Find clinics with metrics for today.
 * @param {number} organizationId
 * @param {string} timezone - IANA timezone string (not used, using UTC for simplicity)
 * @returns {Promise<Array<{id:number, name:string, isDefault:boolean, metrics:Object}>>}
 */
const findClinicsWithMetrics = async (organizationId, timezone) => {
  const clinics = await findClinicsByOrganization(organizationId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // We'll compute metrics for the single clinic (organization)
  const clinic = clinics[0];
  const metrics = await getClinicMetrics(clinic.id, organizationId, todayStart, todayEnd);
  return [{ ...clinic, metrics }];
};

/**
 * Get metrics for a clinic (organization) for a given date range.
 * @param {number} clinicId - same as organizationId
 * @param {number} organizationId
 * @param {Date} start - start of day (UTC)
 * @param {Date} end - end of day (UTC)
 * @returns {Promise<Object>} metrics object
 */
const getClinicMetrics = async (clinicId, organizationId, start, end) => {
  // Ensure clinicId matches organizationId (since we don't have separate clinic)
  if (clinicId !== organizationId) {
    // In case of mismatch, treat as organization scope
    // but we will still compute for organizationId
  }

  // 1. Open consultations (status OPEN)
  const openConsultations = await prisma.consultation.count({
    where: {
      organizationId,
      status: 'OPEN',
    },
  });

  // 2. Closed consultations today (status CLOSED and closedAt within [start, end))
  const closedConsultationsToday = await prisma.consultation.count({
    where: {
      organizationId,
      status: 'CLOSED',
      closedAt: {
        gte: start,
        lt: end,
      },
    },
  });

  // 3. Active clients (isActive true)
  const activeClients = await prisma.client.count({
    where: {
      organizationId,
      isActive: true,
    },
  });

  // 4. Active pets: pets whose client is active
  const activePets = await prisma.pet.count({
    where: {
      client: {
        organizationId,
        isActive: true,
      },
    },
  });

  // 5. Sales today: sum of total and count where status = 'completed' and createdAt within [start, end)
  const salesResult = await prisma.sale.aggregate({
    where: {
      organizationId,
      status: 'completed',
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    _sum: {
      total: true,
      tax: true,
    },
    _count: true,
  });

  const salesTodayTotal = Number(salesResult._sum.total) || 0;
  const salesTodayTax = Number(salesResult._sum.tax) || 0;
  const salesTodayCount = Number(salesResult._count) || 0;
  const salesTodaySubtotal = salesTodayTotal - salesTodayTax; // assuming total = subtotal + tax

  return {
    openConsultations,
    closedConsultationsToday,
    activeClients,
    activePets,
    salesToday: {
      total: salesTodayTotal,
      tax: salesTodayTax,
      subtotal: salesTodaySubtotal,
      count: salesTodayCount,
    },
  };
};

module.exports = {
  findClinicsByOrganization,
  findClinicsWithMetrics,
  getClinicMetrics,
};
