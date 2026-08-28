// src/modules/cash/services/cashregister.service.js

const repository = require("./cashregister.repository");
const { AppError } = require("../../../core/errors/AppError");

// ============================
// CASH REGISTER SERVICE
// ============================
const getRegisters = (clinicId) => {
  return repository.findRegistersByClinic(clinicId);
};

const getRegister = async (id, clinicId) => {
  const register = await repository.findRegisterById(id, clinicId);

  if (!register) {
    throw new AppError("Caja no encontrada", 404);
  }

  return register;
};

const createRegister = async ({ name, code, clinicId }) => {
  const existing = await repository.findRegisterByName(name, clinicId);

  if (existing) {
    throw new AppError("Ya existe una caja con ese nombre", 409);
  }

  return repository.createRegister({
    name,
    code: code || null,
    clinicId,
    isActive: true,
  });
};

const updateRegister = async (id, clinicId, data) => {
  const register = await repository.findRegisterById(id, clinicId);

  if (!register) {
    throw new AppError("Caja no encontrada", 404);
  }

  await repository.updateRegister(id, clinicId, data);

  return repository.findRegisterById(id, clinicId);
};

/**
 * ============================
 * OPEN SHIFT
 * ============================
 */

const openShift = async ({
  cashRegisterId,
  userId,
  clinicId,
  openingAmount,
}) => {
  if (Number(openingAmount) < 0) {
    throw new AppError("El monto de apertura no puede ser negativo", 400);
  }

  const register = await repository.findRegisterById(cashRegisterId, clinicId);

  if (!register) {
    throw new AppError("Caja no encontrada", 404);
  }

  if (!register.isActive) {
    throw new AppError("La caja está inactiva", 400);
  }

  /**
   * Una caja no puede tener dos turnos abiertos
   */
  const existingRegisterShift = await repository.findOpenShiftByRegister(
    cashRegisterId,
    clinicId,
  );

  if (existingRegisterShift) {
    throw new AppError("La caja ya tiene un turno abierto", 409);
  }

  /**
   * Un usuario tampoco debería tener
   * dos cajas abiertas simultáneamente.
   */
  const existingUserShift = await repository.findOpenShiftByUser(
    userId,
    clinicId,
  );

  if (existingUserShift) {
    throw new AppError("El usuario ya tiene un turno de caja abierto", 409);
  }

  return repository.createShift({
    cashRegisterId,
    userId,
    clinicId,
    openingAmount,
  });
};
/**
 * ============================
 * CURRENT SHIFT
 * ============================
 */

const getCurrentShift = async ({ cashRegisterId, clinicId }) => {
  const shift = await repository.findOpenShiftByRegister(
    cashRegisterId,
    clinicId,
  );

  if (!shift) {
    throw new AppError("No hay un turno abierto para esta caja", 404);
  }

  const totals = await repository.getShiftTotals(shift.id, clinicId);

  const expectedAmount =
    Number(shift.openingAmount) +
    totals.cashIn +
    totals.cashPayments -
    totals.cashOut +
    totals.adjustments;

  return {
    ...shift,
    totals,
    expectedAmount,
  };
};

const getShift = async (cashShiftId, clinicId) => {
  const shift = await repository.findShiftById(cashShiftId, clinicId);
  if (!shift) throw new AppError("Turno de caja no encontrado", 404);
  return shift;
};

const getMovements = async (cashShiftId, clinicId) => {
  await getShift(cashShiftId, clinicId);
  return repository.findMovementsByShift(cashShiftId, clinicId);
};

const getAdminSummary = (clinicId, filters) => repository.adminSummary(clinicId, filters);

const getAdminShifts = (clinicId, filters) => repository.adminShifts(clinicId, filters);

const getAdminShift = async (id, clinicId) => {
  const shift = await repository.adminShiftById(id, clinicId);
  if (!shift) throw new AppError("Turno de caja no encontrado", 404);
  const paymentSummary = {};
  for (const payment of shift.payments) {
    paymentSummary[payment.method] = (paymentSummary[payment.method] || 0) + Number(payment.amount);
  }
  return {
    ...shift,
    paymentSummary: Object.fromEntries(
      Object.entries(paymentSummary).map(([method, amount]) => [method, amount.toFixed(2)]),
    ),
  };
};

const getAdminMovements = (clinicId, filters) => repository.adminMovements(clinicId, filters);

const createAdminAdjustment = async ({ id, clinicId, userId, amount, reason, notes }) => {
  const shift = await repository.findShiftById(id, clinicId);
  if (!shift) throw new AppError("Turno de caja no encontrado", 404);
  return repository.createAdminAdjustment({
    cashShiftId: id,
    clinicId,
    userId,
    type: "ADJUSTMENT",
    amount,
    reason,
    notes: notes || null,
  });
};

/**
 * ============================
 * CASH MOVEMENT
 * ============================
 */

const createMovement = async ({
  cashShiftId,
  clinicId,
  userId,
  type,
  amount,
  reason,
  notes,
}) => {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new AppError("El monto debe ser mayor a cero", 400);
  }

  if (!["CASH_IN", "CASH_OUT", "ADJUSTMENT"].includes(type)) {
    throw new AppError("Tipo de movimiento inválido", 400);
  }

  const shift = await repository.findShiftById(cashShiftId, clinicId);

  if (!shift) {
    throw new AppError("Turno de caja no encontrado", 404);
  }

  if (shift.status !== "OPEN") {
    throw new AppError(
      "No se pueden registrar movimientos en un turno cerrado",
      400,
    );
  }

  return repository.createMovement({
    cashShiftId,
    clinicId,
    userId,
    type,
    amount,
    reason: reason || null,
    notes: notes || null,
  });
};

/**
 * ============================
 * CLOSE SHIFT
 * ============================
 */

const closeShift = async ({
  cashShiftId,
  clinicId,
  countedAmount,
  closingNotes,
  differenceReason,
}) => {
  const shift = await repository.findShiftById(cashShiftId, clinicId);

  if (!shift) {
    throw new AppError("Turno de caja no encontrado", 404);
  }

  if (shift.status !== "OPEN") {
    throw new AppError("El turno de caja ya está cerrado", 400);
  }

  const totals = await repository.getShiftTotals(cashShiftId, clinicId);

  const expectedAmount =
    Number(shift.openingAmount) +
    totals.cashIn +
    totals.cashPayments -
    totals.cashOut +
    totals.adjustments;

  const counted = Number(countedAmount);

  const difference = counted - expectedAmount;

  /**
   * Si hay diferencia debería registrarse
   * el motivo.
   */
  if (difference !== 0 && !differenceReason) {
    throw new AppError("Debe indicar el motivo de la diferencia de caja", 400);
  }

  await repository.closeShift(cashShiftId, clinicId, {
    status: "CLOSED",
    closedAt: new Date(),
    expectedAmount,
    countedAmount: counted,
    difference,
    closingNotes: closingNotes || null,
    differenceReason: differenceReason || null,
  });

  return repository.findShiftById(cashShiftId, clinicId);
};

module.exports = {
  getRegisters,
  getRegister,
  createRegister,
  updateRegister,
  openShift,
  getCurrentShift,
  createMovement,
  closeShift,
  getShift,
  getMovements,
  getAdminSummary,
  getAdminShifts,
  getAdminShift,
  getAdminMovements,
  createAdminAdjustment,
};
