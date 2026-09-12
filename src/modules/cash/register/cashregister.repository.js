// src/modules/cash/repositories/cash.repository.js

const { prisma } = require("../../../lib/prisma");
const { AppError } = require("../../../core/errors/AppError");
const { SALE_STATUS, LEGACY_SALE_STATUS } = require('../../sales/sale.status');

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

const findOpenShiftByRegister = async (cashRegisterId, clinicId, userId) => {
  return prisma.cashShift.findFirst({
    where: {
      cashRegisterId,
      clinicId,
      status: "OPEN",
      ...(userId ? { userId } : {}),
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

const findShiftById = async (id, clinicId, userId) => {
  return prisma.cashShift.findFirst({
    where: {
      id,
      clinicId,
      ...(userId ? { userId } : {}),
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

const createShiftAtomic = async (data) => {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM cash_registers
      WHERE id = ${data.cashRegisterId} AND clinicId = ${data.clinicId}
      FOR UPDATE
    `;

    const register = await tx.cashRegister.findFirst({
      where: { id: data.cashRegisterId, clinicId: data.clinicId },
    });
    if (!register) throw new AppError("Caja no encontrada", 404);
    if (!register.isActive) throw new AppError("La caja esta inactiva", 400);

    const existingRegisterShift = await tx.cashShift.findFirst({
      where: { cashRegisterId: data.cashRegisterId, clinicId: data.clinicId, status: "OPEN" },
    });
    if (existingRegisterShift) throw new AppError("La caja ya tiene un turno abierto", 409);

    const existingUserShift = await tx.cashShift.findFirst({
      where: { userId: data.userId, clinicId: data.clinicId, status: "OPEN" },
    });
    if (existingUserShift) throw new AppError("El usuario ya tiene un turno de caja abierto", 409);

    return tx.cashShift.create({
      data,
      include: {
        cashRegister: true,
        user: { select: { id: true, username: true } },
      },
    });
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

const closeShiftAtomic = async ({ id, clinicId, userId, countedAmount, closingNotes, differenceReason }) => {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM cash_shifts
      WHERE id = ${id} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    const shift = await tx.cashShift.findFirst({
      where: { id, clinicId, ...(userId ? { userId } : {}) },
    });
    if (!shift) throw new AppError("Turno de caja no encontrado", 404);
    if (shift.status !== "OPEN") throw new AppError("El turno de caja ya esta cerrado", 400);

    const waitingSalesCount = await tx.sale.count({
      where: {
        clinicId,
        cashShiftId: id,
        status: { in: [SALE_STATUS.WAITING, LEGACY_SALE_STATUS.WAITING] },
      },
    });
    if (waitingSalesCount > 0) {
      throw new AppError(
        `No se puede cerrar el turno porque existen ${waitingSalesCount} cuentas en espera`,
        400,
        "WAITING_SALES_PENDING",
      );
    }

    const totals = await getShiftTotalsWithClient(tx, id, clinicId);
    const expectedAmount = Number(shift.openingAmount) + totals.cashIn + totals.cashPayments - totals.cashOut + totals.adjustments;
    const difference = Number(countedAmount) - expectedAmount;
    if (difference !== 0 && !differenceReason) {
      throw new AppError("Debe indicar el motivo de la diferencia de caja", 400);
    }

    const updated = await tx.cashShift.updateMany({
      where: { id, clinicId, status: "OPEN" },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        expectedAmount,
        countedAmount: Number(countedAmount),
        difference,
        closingNotes: closingNotes || null,
        differenceReason: differenceReason || null,
      },
    });
    if (updated.count !== 1) throw new AppError("El turno de caja ya fue cerrado", 409);

    return tx.cashShift.findUnique({
      where: { id },
      include: {
        cashRegister: true,
        user: { select: { id: true, username: true, email: true } },
        movements: { orderBy: { createdAt: "desc" } },
        payments: true,
      },
    });
  });
};

const getShiftTotalsWithClient = async (client, cashShiftId, clinicId) => {
  const [movements, payments] = await Promise.all([
    client.cashMovement.findMany({
      where: { cashShiftId, clinicId },
      select: { type: true, amount: true },
    }),
    client.payment.findMany({
      where: { cashShiftId, method: "CASH" },
      select: { amount: true },
    }),
  ]);

  return movements.reduce((totals, movement) => {
    const amount = Number(movement.amount);
    if (movement.type === "CASH_IN") totals.cashIn += amount;
    if (movement.type === "CASH_OUT") totals.cashOut += amount;
    if (movement.type === "ADJUSTMENT") totals.adjustments += amount;
    return totals;
  }, {
    cashIn: 0,
    cashOut: 0,
    adjustments: 0,
    cashPayments: payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
  });
};

const createMovementAtomic = async (data) => {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM cash_shifts
      WHERE id = ${data.cashShiftId} AND clinicId = ${data.clinicId}
      FOR UPDATE
    `;

    const shift = await tx.cashShift.findFirst({
      where: {
        id: data.cashShiftId,
        clinicId: data.clinicId,
        ...(data.userIdScope ? { userId: data.userIdScope } : {}),
      },
    });
    if (!shift) throw new AppError("Turno de caja no encontrado", 404);
    if (shift.status !== "OPEN") throw new AppError("No se pueden registrar movimientos en un turno cerrado", 400);

    if (data.type === "CASH_OUT") {
      const totals = await getShiftTotalsWithClient(tx, data.cashShiftId, data.clinicId);
      const available = Number(shift.openingAmount) + totals.cashIn + totals.cashPayments - totals.cashOut + totals.adjustments;
      if (Number(data.amount) > available) {
        throw new AppError("No hay efectivo suficiente para realizar el retiro", 400, "INSUFFICIENT_CASH");
      }
    }

    const { userIdScope, ...movementData } = data;
    return tx.cashMovement.create({ data: movementData });
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
  const saleWhere = { clinicId, status: { in: [SALE_STATUS.CONFIRMED, LEGACY_SALE_STATUS.CONFIRMED] } };
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

const findAdminRegisters = async (clinicId, isActive) => {
  const where = { clinicId };
  if (isActive !== undefined) where.isActive = isActive;
  return prisma.cashRegister.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      shifts: {
        orderBy: { openedAt: "desc" },
        take: 1,
        include: { user: { select: { id: true, username: true, email: true } } },
      },
    },
  });
};

const findAdminRegisterById = (id, clinicId) => prisma.cashRegister.findFirst({
  where: { id, clinicId },
  include: {
    clinic: true,
    shifts: {
      orderBy: { openedAt: "desc" },
      take: 10,
      include: { user: { select: { id: true, username: true, email: true, role: true } }, movements: true, payments: true },
    },
  },
});

const updateAdminRegister = (id, clinicId, data) => prisma.cashRegister.updateMany({
  where: { id, clinicId },
  data,
});

const updateAdminRegisterStatus = (id, clinicId, isActive) => prisma.cashRegister.updateMany({
  where: { id, clinicId },
  data: { isActive },
});

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
  createShiftAtomic,
  closeShift,
  closeShiftAtomic,

  createMovement,
  createMovementAtomic,
  findMovementsByShift,

  getShiftTotals,
  adminSummary,
  adminShifts,
  adminShiftById,
  adminMovements,
  createAdminAdjustment,
  findAdminRegisters,
  findAdminRegisterById,
  updateAdminRegister,
  updateAdminRegisterStatus,
};
