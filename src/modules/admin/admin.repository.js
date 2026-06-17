const { prisma } = require('../../lib/prisma');

/**
 * Devuelve el inicio y fin del "dia de hoy" en la zona horaria indicada.
 * Se calcula en UTC con el offset de la TZ para que la consulta Prisma
 * (que almacena DateTime en UTC) reciba los limites correctos.
 */
const getDayRangeInTimezone = (timezone) => {
  const now = new Date();

  // Helpers de fecha en una TZ dada usando Intl.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const yyyy = parts.find(p => p.type === 'year').value;
  const mm = parts.find(p => p.type === 'month').value;
  const dd = parts.find(p => p.type === 'day').value;

  // Construir inicio/fin del dia en formato ISO local y convertirlos a Date.
  // start = YYYY-MM-DDT00:00:00, end = YYYY-MM-DDT23:59:59.999 en la TZ.
  // Usamos el truco de pedir un Date UTC a partir del string con offset.
  const offsetIso = (date, hh, mm2, ss, ms) => {
    // date = 'YYYY-MM-DD'
    const localString = `${date}T${hh}:${mm2}:${ss}.${ms}`;
    // Calculamos el offset real de la TZ en ese instante.
    const d = new Date(localString + 'Z');
    const tzDate = new Date(d.toLocaleString('en-US', { timeZone: timezone }));
    const diff = d.getTime() - tzDate.getTime();
    return new Date(d.getTime() - diff);
  };

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const start = offsetIso(dateStr, '00', '00', '00', '000');
  const end = offsetIso(dateStr, '23', '59', '59', '999');
  return { start, end };
};

/**
 * Metricas para un unico clinicId (scope "clinic" para ADMIN).
 * Devuelve conteos y agregados del dia en la TZ de la Organization.
 */
const getClinicMetrics = async (clinicId, organizationId, timezone) => {
  const { start, end } = getDayRangeInTimezone(timezone);

  // Conteos: consultas abiertas/cerradas, clientes y mascotas activas.
  const [
    openConsultations,
    closedConsultationsToday,
    activeClients,
    activePets,
    salesAgg,
  ] = await Promise.all([
    prisma.consultation.count({
      where: { organizationId, clinicId, status: 'OPEN' },
    }),
    prisma.consultation.count({
      where: {
        organizationId,
        clinicId,
        status: 'CLOSED',
        closedAt: { gte: start, lte: end },
      },
    }),
    prisma.client.count({
      where: { organizationId, clinicId, isActive: true },
    }),
    prisma.pet.count({
      where: { organizationId, clinicId, isActive: true },
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,
        clinicId,
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true, tax: true, subtotal: true },
      _count: true,
    }),
  ]);

  return {
    openConsultations,
    closedConsultationsToday,
    activeClients,
    activePets,
    salesToday: {
      count: salesAgg._count || 0,
      total: salesAgg._sum.total || 0,
      tax: salesAgg._sum.tax || 0,
      subtotal: salesAgg._sum.subtotal || 0,
    },
  };
};

/**
 * Lista clinicas de una Organization. Usado para SUPER_ADMIN.
 */
const findClinicsByOrganization = async (organizationId) => {
  return await prisma.clinic.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, isDefault: true, timezone: true },
  });
};

/**
 * Lista clinicas de una Organization con metricas del dia.
 * Usado por GET /api/admin/clinics (SUPER_ADMIN).
 */
const findClinicsWithMetrics = async (organizationId, timezone) => {
  const clinics = await prisma.clinic.findMany({
    where: { organizationId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
    },
  });

  const withMetrics = await Promise.all(
    clinics.map(async (c) => ({
      ...c,
      metrics: c.isActive
        ? await getClinicMetrics(c.id, organizationId, timezone)
        : null,
    }))
  );

  return withMetrics;
};

/**
 * Lista usuarios de una Organization con metricas simples.
 * Usado por GET /api/admin/users (SUPER_ADMIN).
 *
 * Metricas: cantidad de clinicas a las que pertenece y ultima actividad
 * (lastLogin). Si la org no tiene clinicas, usersCount por clinica queda
 * en 0. No expone password ni campos sensibles.
 */
const findUsersWithMetrics = async (organizationId) => {
  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      // Relacion muchos-a-muchos con Clinic no existe en el schema.
      // Mantenemos la lista vacia; si se agrega la relacion M2M luego,
      // este campo se llenara automaticamente.
    },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
    clinicCount: 0,
  }));
};

module.exports = {
  getClinicMetrics,
  findClinicsByOrganization,
  findClinicsWithMetrics,
  findUsersWithMetrics,
  getDayRangeInTimezone,
};
