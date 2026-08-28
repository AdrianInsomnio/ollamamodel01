// src/modules/cash/repositories/cash.repository.js

const { prisma } = require("../../../lib/prisma");

/**
 * ============================
 * CASH REGISTER
 * ============================
 */

const findRegistersByClinic = async (clinicId) => {
  return prisma.cashRegister.findMany({
    where: {
      clinicId,
    },
    orderBy: {
      name: "asc",
    },
  });
};

const findRegisterById = async (id, clinicId) => {
  return prisma.cashRegister.findFirst({
    where: {
      id,
      clinicId,
    },
    include: {
      shifts: {
        orderBy: {
          openedAt: "desc",
        },
        take: 10,
      },
    },
  });
};

const findRegisterByName = async (name, clinicId) => {
  return prisma.cashRegister.findFirst({
    where: {
      name,
      clinicId,
    },
  });
};

const createRegister = async (data) => {
  return prisma.cashRegister.create({
    data,
  });
};

const updateRegister = async (id, clinicId, data) => {
  return prisma.cashRegister.updateMany({
    where: {
      id,
      clinicId,
    },
    data,
  });
};

/**
 * ============================
 * CASH SHIFT
 * ============================
 */

const findOpenShiftByRegister = async (cashRegisterId, clinicId) => {
  return prisma.cashShift.findFirst({
    where: {
      cashRegisterId,
      clinicId,
      status: "OPEN",
    },
    include: {
      cashRegister: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
};

const findOpenShiftByUser = async (userId, clinicId) => {
  return prisma.cashShift.findFirst({
    where: {
      userId,
      clinicId,
      status: "OPEN",
    },
    include: {
      cashRegister: true,
    },
  });
};

const findShiftById = async (id, clinicId) => {
  return prisma.cashShift.findFirst({
    where: {
      id,
      clinicId,
    },
    include: {
      cashRegister: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      movements: {
        orderBy: {
          createdAt: "desc",
        },
      },
      payments: true,
    },
  });
};

const createShift = async (data) => {
  return prisma.cashShift.create({
    data,
    include: {
      cashRegister: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
};

const closeShift = async (id, clinicId, data) => {
  return prisma.cashShift.updateMany({
    where: {
      id,
      clinicId,
      status: "OPEN",
    },
    data,
  });
};

/**
 * ============================
 * CASH MOVEMENTS
 * ============================
 */

const createMovement = async (data) => {
  return prisma.cashMovement.create({
    data,
  });
};

const findMovementsByShift = async (cashShiftId, clinicId) => {
  return prisma.cashMovement.findMany({
    where: {
      cashShiftId,
      clinicId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================
 * CASH CALCULATIONS
 * ============================
 */

const getShiftTotals = async (cashShiftId, clinicId) => {
  const movements = await prisma.cashMovement.findMany({
    where: {
      cashShiftId,
      clinicId,
    },
    select: {
      type: true,
      amount: true,
    },
  });

  const payments = await prisma.payment.findMany({
    where: {
      cashShiftId,
      method: "CASH",
    },
    select: {
      amount: true,
    },
  });

  let cashIn = 0;
  let cashOut = 0;
  let adjustments = 0;
  let cashPayments = 0;

  for (const movement of movements) {
    const amount = Number(movement.amount);

    if (movement.type === "CASH_IN") {
      cashIn += amount;
    }

    if (movement.type === "CASH_OUT") {
      cashOut += amount;
    }

    if (movement.type === "ADJUSTMENT") {
      adjustments += amount;
    }
  }

  for (const payment of payments) {
    cashPayments += Number(payment.amount);
  }

  return {
    cashIn,
    cashOut,
    adjustments,
    cashPayments,
  };
};

const buildShiftWhere = (clinicId, filters = {}) => {
  const where = { clinicId };
  const openedAt = {};
  if (filters.dateFrom) openedAt.gte = filters.dateFrom;
  if (filters.dateTo) openedAt.lt = filters.dateTo;
  if (Object.keys(openedAt).length) where.openedAt = openedAt;
  if (filters.status) where.status = filters.status;
  if (filters.cashRegisterId) where.cashRegisterId = filters.cashRegisterId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.hasDifference === true) where.difference = { not: 0 };
  if (filters.hasDifference === false) where.OR = [{ difference: 0 }, { difference: null }];
  return where;
};

const buildMovementWhere = (clinicId, filters = {}) => {
  const where = { clinicId };
  const createdAt = {};
  if (filters.dateFrom) createdAt.gte = filters.dateFrom;
  if (filters.dateTo) createdAt.lt = filters.dateTo;
  if (Object.keys(createdAt).length) where.createdAt = createdAt;
  if (filters.type) where.type = filters.type;
  if (filters.userId) where.userId = filters.userId;
  if (filters.cashShiftId) where.cashShiftId = filters.cashShiftId;
  if (filters.cashRegisterId) where.cashShift = { cashRegisterId: filters.cashRegisterId };
  return where;
};

const adminSummary = async (clinicId, filters) => {
  const period = {};
  if (filters.dateFrom) period.gte = filters.dateFrom;
  if (filters.dateTo) period.lt = filters.dateTo;
  const saleWhere = { clinicId, status: "completed" };
  const paymentWhere = { cashShift: { clinicId } };
  if (Object.keys(period).length) { saleWhere.createdAt = period; paymentWhere.paidAt = period; }
  if (filters.cashRegisterId || filters.userId) {
    saleWhere.cashShift = {};
    if (filters.cashRegisterId) { saleWhere.cashShift.cashRegisterId = filters.cashRegisterId; paymentWhere.cashShift.cashRegisterId = filters.cashRegisterId; }
    if (filters.userId) { saleWhere.cashShift.userId = filters.userId; paymentWhere.cashShift.userId = filters.userId; }
  }
  const shiftWhere = buildShiftWhere(clinicId, filters);
  const [sales, payments, movements, open, closed, withDifference] = await Promise.all([
    prisma.sale.aggregate({ where: saleWhere, _count: { _all: true }, _sum: { total: true } }),
    prisma.payment.groupBy({ by: ["method"], where: paymentWhere, _sum: { amount: true } }),
    prisma.cashMovement.findMany({ where: buildMovementWhere(clinicId, filters), select: { type: true, amount: true } }),
    prisma.cashShift.count({ where: { ...shiftWhere, status: "OPEN" } }),
    prisma.cashShift.count({ where: { ...shiftWhere, status: "CLOSED" } }),
    prisma.cashShift.count({ where: { ...shiftWhere, difference: { not: 0 } } }),
  ]);
  const movementTotals = { cashIn: 0, cashOut: 0 };
  for (const movement of movements) {
    if (movement.type === "CASH_IN") movementTotals.cashIn += Number(movement.amount);
    if (movement.type === "CASH_OUT") movementTotals.cashOut += Number(movement.amount);
  }
  const paymentTotals = Object.fromEntries(payments.map((p) => [p.method, Number(p._sum.amount || 0)]));
  return {
    sales: { count: sales._count._all, total: Number(sales._sum.total || 0).toFixed(2) },
    payments: { cash: (paymentTotals.CASH || 0).toFixed(2), debitCard: (paymentTotals.DEBIT_CARD || 0).toFixed(2), creditCard: (paymentTotals.CREDIT_CARD || 0).toFixed(2), bankTransfer: (paymentTotals.BANK_TRANSFER || 0).toFixed(2) },
    movements: { cashIn: movementTotals.cashIn.toFixed(2), cashOut: movementTotals.cashOut.toFixed(2) },
    shifts: { open, closed, withDifference },
  };
};

const adminShifts = async (clinicId, filters) => {
  const where = buildShiftWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await Promise.all([
    prisma.cashShift.findMany({ where, skip, take: filters.pageSize, orderBy: { openedAt: "desc" }, select: { id: true, status: true, openedAt: true, closedAt: true, openingAmount: true, expectedAmount: true, countedAmount: true, difference: true, cashRegister: { select: { id: true, name: true, code: true } }, user: { select: { id: true, username: true, email: true } } } }),
    prisma.cashShift.count({ where }),
  ]);
  return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
};

const adminShiftById = (id, clinicId) => prisma.cashShift.findFirst({ where: { id, clinicId }, include: { cashRegister: true, clinic: true, user: { select: { id: true, username: true, email: true, role: true } }, sales: { include: { saleItems: true, fiscalDocument: true } }, payments: { include: { fiscalDocument: true } }, movements: { include: { user: { select: { id: true, username: true, email: true } } }, orderBy: { createdAt: "asc" } } } });

const adminMovements = async (clinicId, filters) => {
  const where = buildMovementWhere(clinicId, filters);
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await Promise.all([
    prisma.cashMovement.findMany({ where, skip, take: filters.pageSize, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, username: true, email: true } }, cashShift: { include: { cashRegister: { select: { id: true, name: true, code: true } } } } } }),
    prisma.cashMovement.count({ where }),
  ]);
  return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
};

const createAdminAdjustment = (data) => prisma.cashMovement.create({ data });

module.exports = {
  findRegistersByClinic,
  findRegisterById,
  findRegisterByName,
  createRegister,
  updateRegister,

  findOpenShiftByRegister,
  findOpenShiftByUser,
  findShiftById,
  createShift,
  closeShift,

  createMovement,
  findMovementsByShift,

  getShiftTotals,
  adminSummary,
  adminShifts,
  adminShiftById,
  adminMovements,
  createAdminAdjustment,
};
