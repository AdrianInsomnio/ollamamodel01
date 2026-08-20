const { prisma } = require("../../lib/prisma");
const { AppError } = require("../../core/errors/AppError");
const { hashPassword } = require("../../core/utils/password.util");

const startOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const getDayRangeInTimezone = (timezone) => {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
};

const findClinicsByOrganization = async (organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: Number(organizationId) },
    select: { id: true, name: true },
  });
  if (!org) {
    throw new AppError("Organization not found", 404);
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
 * Obtiene métricas de una clínica.
 * Si no hay datos, retorna ceros (el frontend mostrará "Sin Datos para mostrar").
 */
const getClinicMetrics = async (clinicId, start, end) => {
  const cId = Number(clinicId);

  // Consultas abiertas
  const openConsultations = await prisma.consultation.count({
    where: { clinicId: cId, status: "OPEN" },
  });

  // Consultas cerradas hoy
  const closedConsultationsToday = await prisma.consultation.count({
    where: {
      clinicId: cId,
      status: "CLOSED",
      closedAt: { gte: start, lt: end },
    },
  });

  // Clientes activos (a través de clinicId)
  const activeClients = await prisma.client.count({
    where: { clinicId: cId, isActive: true },
  });

  // Mascotas activas (a través de clinicId en client)
  const activePets = await prisma.pet.count({
    where: { client: { clinicId: cId }, isActive: true },
  });

  // Ventas del día
  const salesResult = await prisma.sale.aggregate({
    where: {
      clinicId: cId,
      status: "completed",
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
      createdAt: true,
      clinics: { select: { id: true, name: true } },
    },
  });
};

const createUser = async (data) => {
  const { username, email, password, role, isActive, organizationId, clinicIds = [] } = data;
  const orgId = Number(organizationId);
  
  // Hash the password before storing
  const hashedPassword = await hashPassword(password);
  
  const userData = {
    username,
    email,
    password: hashedPassword,
    role,
    isActive: isActive ?? true,
    organizationId: orgId,
  };
  let user;
  await prisma.$transaction(async (tx) => {
    user = await tx.user.create({ data: userData });
    if (clinicIds && clinicIds.length > 0) {
      const clinicIdNumbers = clinicIds.map(Number);
      await tx.user.update({
        where: { id: user.id },
        data: {
          clinics: { connect: clinicIdNumbers.map(id => ({ id })) },
        },
      });
    }
  });
  return user;
};

const updateUser = async (id, data) => {
  const { username, email, role, isActive, password } = data;
  const updateData = {};
  if (username !== undefined) updateData.username = username;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password !== undefined && password !== "") {
    updateData.password = await hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      clinics: { select: { id: true, name: true } },
    },
  });
  return user;
};

const deleteUser = async (id) => {
  await prisma.user.delete({
    where: { id: Number(id) },
  });
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
  updateUser,
  deleteUser,
  updateUserClinics,
};
