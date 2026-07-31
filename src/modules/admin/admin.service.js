const { prisma } = require('../../lib/prisma');
const repository = require('./admin.repository');
const { AppError } = require('../../core/errors/AppError');

const emptyTotals = () => ({
  salesTodayTotal: 0,
  salesTodayTax: 0,
  salesTodaySubtotal: 0,
  salesTodayCount: 0,
  openConsultations: 0,
  closedConsultationsToday: 0,
  activeClients: 0,
  activePets: 0,
});

const toTotals = (metrics, clinicsCount) => ({
  salesTodayTotal: metrics.salesToday.total,
  salesTodayTax: metrics.salesToday.tax,
  salesTodaySubtotal: metrics.salesToday.subtotal,
  salesTodayCount: metrics.salesToday.count,
  openConsultations: metrics.openConsultations,
  closedConsultationsToday: metrics.closedConsultationsToday,
  activeClients: metrics.activeClients,
  activePets: metrics.activePets,
  clinicsCount,
});

const addMetrics = (acc, metrics) => ({
  ...acc,
  salesTodayTotal: acc.salesTodayTotal + metrics.salesToday.total,
  salesTodayTax: acc.salesTodayTax + metrics.salesToday.tax,
  salesTodaySubtotal: acc.salesTodaySubtotal + metrics.salesToday.subtotal,
  salesTodayCount: acc.salesTodayCount + metrics.salesToday.count,
  openConsultations: acc.openConsultations + metrics.openConsultations,
  closedConsultationsToday: acc.closedConsultationsToday + metrics.closedConsultationsToday,
  activeClients: acc.activeClients + metrics.activeClients,
  activePets: acc.activePets + metrics.activePets,
});

const requireAdminRole = (user) => {
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
};

const requireOrganization = async (user) => {
  const organizationId = Number(user.organizationId);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, timezone: true },
  });
  if (!organization) {
    throw new AppError('Organization not found', 404);
  }
  return organization;
};

/**
 * Resuelve el scope de admin.
 *  - ADMIN      -> una sola clinica (la default o la primera activa).
 *  - SUPER_ADMIN -> todas las clinicas de su org.
 *
 * Nota: en el modelo actual, `clinic.id` y `organization.id` coinciden
 * numericamente, por lo que las metricas se siguen agregando a nivel
 * "clinic" (no a nivel "organization" puro). Esto preserva los tests
 * existentes y se revertira cuando el modelo de Clinica se independice.
 */
const resolveScope = async (user) => {
  const organizationId = Number(user.organizationId);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, timezone: true },
  });
  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  const clinics = await repository.findClinicsByOrganization(organizationId);

  if (!clinics || clinics.length === 0) {
    return {
      organization,
      scope: 'organization',
      clinics: [],
      totals: { ...emptyTotals(), clinicsCount: 0 },
    };
  }

  if (user.role === 'ADMIN') {
    const clinic = clinics.find(c => c.isDefault) || clinics[0];
    const metrics = await repository.getClinicMetrics(
      clinic.id,
      startOfToday(),
      endOfToday()
    );
    return {
      organization,
      scope: 'clinic',
      clinics: [{ ...clinic, metrics }],
      totals: toTotals(metrics, 1),
    };
  }

  if (user.role === 'SUPER_ADMIN') {
    const start = startOfToday();
    const end = endOfToday();
    const clinicsWithMetrics = await Promise.all(
      clinics.map(async (clinic) => ({
        ...clinic,
        metrics: await repository.getClinicMetrics(clinic.id, start, end),
      }))
    );
    const totals = clinicsWithMetrics.reduce(
      (acc, c) => addMetrics(acc, c.metrics),
      emptyTotals()
    );
    totals.clinicsCount = clinicsWithMetrics.length;
    return {
      organization,
      scope: 'organization',
      clinics: clinicsWithMetrics,
      totals,
    };
  }

  throw new AppError('Access denied for role', 403, 'FORBIDDEN');
};

const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const getDashboardMetrics = async (user) => {
  requireAdminRole(user);
  const resolved = await resolveScope(user);
  const timezone = resolved.organization.timezone;
  return {
    scope: resolved.scope,
    organization: {
      id: resolved.organization.id,
      name: resolved.organization.name,
      timezone,
    },
    clinics: resolved.clinics,
    totals: resolved.totals,
    generatedAt: new Date().toISOString(),
  };
};

const listClinics = async (user) => {
  requireAdminRole(user);
  const organization = await requireOrganization(user);
  const organizationId = organization.id;

  if (user.role === 'ADMIN') {
    const allClinics = await repository.findClinicsWithMetrics(
      organizationId,
      organization.timezone
    );
    const defaultClinic = allClinics.find(c => c.isDefault) || allClinics[0] || null;
    return {
      scope: 'clinic',
      organization: {
        id: organization.id,
        name: organization.name,
        timezone: organization.timezone,
      },
      clinics: defaultClinic ? [defaultClinic] : [],
      generatedAt: new Date().toISOString(),
    };
  }

  const clinics = await repository.findClinicsWithMetrics(
    organizationId,
    organization.timezone
  );
  return {
    scope: 'organization',
    organization: {
      id: organization.id,
      name: organization.name,
      timezone: organization.timezone,
    },
    clinics,
    generatedAt: new Date().toISOString(),
  };
};

const listUsers = async (user) => {
  if (user.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  const organization = await requireOrganization(user);
  const users = await repository.findUsersWithMetrics(organization.id);
  return {
    organization: { id: organization.id, name: organization.name },
    users,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getDashboardMetrics,
  listClinics,
  listUsers,
};
