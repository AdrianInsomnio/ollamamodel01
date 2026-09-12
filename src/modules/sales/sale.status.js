const SALE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  WAITING: 'WAITING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
});

// Estados históricos conservados únicamente para leer datos existentes.
const LEGACY_SALE_STATUS = Object.freeze({
  DRAFT: 'IN_PROGRESS',
  WAITING: 'HELD',
  CONFIRMED: 'completed',
  CANCELLED: 'cancelled',
});

const isDraftStatus = (status) => status === SALE_STATUS.DRAFT || status === LEGACY_SALE_STATUS.DRAFT;
const isWaitingStatus = (status) => status === SALE_STATUS.WAITING || status === LEGACY_SALE_STATUS.WAITING;
const isConfirmedStatus = (status) => status === SALE_STATUS.CONFIRMED || status === LEGACY_SALE_STATUS.CONFIRMED;
const isCancelledStatus = (status) => status === SALE_STATUS.CANCELLED || status === LEGACY_SALE_STATUS.CANCELLED;

const normalizeSaleStatus = (status) => {
  if (isDraftStatus(status)) return SALE_STATUS.DRAFT;
  if (isWaitingStatus(status)) return SALE_STATUS.WAITING;
  if (isConfirmedStatus(status)) return SALE_STATUS.CONFIRMED;
  if (isCancelledStatus(status)) return SALE_STATUS.CANCELLED;
  return status;
};

module.exports = {
  SALE_STATUS,
  LEGACY_SALE_STATUS,
  isDraftStatus,
  isWaitingStatus,
  isConfirmedStatus,
  isCancelledStatus,
  normalizeSaleStatus,
};
