const { AppError } = require("../../../core/errors/AppError");

const parseDate = (value, endOfDay = false) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new AppError("Fecha inválida", 400);
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
};

const positiveInt = (value, name) => {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${name} inválido`, 400);
  return parsed;
};

const adminFilters = (query) => {
  const page = positiveInt(query.page, "page") || 1;
  const pageSize = Math.min(100, positiveInt(query.pageSize, "pageSize") || 25);
  const filters = {
    dateFrom: parseDate(query.dateFrom),
    dateTo: parseDate(query.dateTo, true),
    cashRegisterId: positiveInt(query.cashRegisterId, "cashRegisterId"),
    userId: positiveInt(query.userId, "userId"),
    cashShiftId: positiveInt(query.cashShiftId, "cashShiftId"),
    page,
    pageSize,
  };
  if (query.status && !["OPEN", "CLOSED", "CANCELLED"].includes(query.status)) throw new AppError("Estado inválido", 400);
  if (query.type && !["CASH_IN", "CASH_OUT", "ADJUSTMENT"].includes(query.type)) throw new AppError("Tipo de movimiento inválido", 400);
  if (query.hasDifference !== undefined && !["true", "false"].includes(query.hasDifference)) throw new AppError("hasDifference inválido", 400);
  if (query.dateFrom && query.dateTo && filters.dateFrom >= filters.dateTo) throw new AppError("El período de fechas es inválido", 400);
  filters.status = query.status;
  filters.type = query.type;
  filters.hasDifference = query.hasDifference === undefined ? undefined : query.hasDifference === "true";
  return filters;
};

const adjustment = (body) => {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("El importe debe ser mayor a cero", 400);
  if (!body.reason || typeof body.reason !== "string" || !body.reason.trim()) throw new AppError("El motivo es obligatorio", 400);
  return { amount, reason: body.reason.trim(), notes: body.notes || null };
};

module.exports = { adminFilters, adjustment, positiveInt };
