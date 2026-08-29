// src/modules/cash/controllers/cashregister.controller.js

const cashRegisterService =
  require("./cashregister.service");
const { adminFilters, adjustment, positiveInt } = require("./cash.validation");

/**
 * GET /cash-registers
 */
const getRegisters = async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;

    const registers =
      await cashRegisterService.getRegisters(
        clinicId
      );

    res.json({
      success: true,
      data: registers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /cash-registers/:id
 */
const getRegister = async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const id = Number(req.params.id);

    const register =
      await cashRegisterService.getRegister(
        id,
        clinicId
      );

    res.json({
      success: true,
      data: register,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /cash-registers
 */
const createRegister = async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;

    const {
      name,
      code,
    } = req.body;

    const register =
      await cashRegisterService.createRegister({
        name,
        code,
        clinicId,
      });

    res.status(201).json({
      success: true,
      data: register,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /cash-registers/:id
 */
const updateRegister = async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const id = Number(req.params.id);

    const register =
      await cashRegisterService.updateRegister(
        id,
        clinicId,
        req.body
      );

    res.json({
      success: true,
      data: register,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /cash-registers/:id/shifts
 *
 * Abrir turno
 */
const openShift = async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const userId = req.user.id;

    const cashRegisterId =
      Number(req.params.id);

    const {
      openingAmount,
    } = req.body;

    const shift =
      await cashRegisterService.openShift({
        cashRegisterId,
        userId,
        clinicId,
        openingAmount,
      });

    res.status(201).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /cash-registers/:id/current-shift
 */
const getCurrentShift = async (
  req,
  res,
  next
) => {
  try {
    const clinicId = req.user.clinicId;

    const cashRegisterId =
      Number(req.params.id);

    const shift =
      await cashRegisterService.getCurrentShift({
        cashRegisterId,
        clinicId,
      });

    res.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    next(error);
  }
};

const getShift = async (req, res, next) => {
  try {
    const shift = await cashRegisterService.getShift(Number(req.params.shiftId), req.user.clinicId);
    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

const getMovements = async (req, res, next) => {
  try {
    const movements = await cashRegisterService.getMovements(Number(req.params.shiftId), req.user.clinicId);
    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
};

const getAdminSummary = async (req, res, next) => {
  try {
    const filters = adminFilters(req.query);
    const summary = await cashRegisterService.getAdminSummary(req.user.clinicId, filters);
    res.json({ period: { from: req.query.dateFrom || null, to: req.query.dateTo || null }, ...summary });
  } catch (error) { next(error); }
};

const getAdminShifts = async (req, res, next) => {
  try { res.json(await cashRegisterService.getAdminShifts(req.user.clinicId, adminFilters(req.query))); } catch (error) { next(error); }
};

const getAdminShift = async (req, res, next) => {
  try { res.json(await cashRegisterService.getAdminShift(positiveInt(req.params.id, "id"), req.user.clinicId)); } catch (error) { next(error); }
};

const getAdminMovements = async (req, res, next) => {
  try { res.json(await cashRegisterService.getAdminMovements(req.user.clinicId, adminFilters(req.query))); } catch (error) { next(error); }
};

const createAdminAdjustment = async (req, res, next) => {
  try {
    const data = adjustment(req.body);
    const movement = await cashRegisterService.createAdminAdjustment({ id: positiveInt(req.params.id, "id"), clinicId: req.user.clinicId, userId: req.user.id, ...data });
    res.status(201).json(movement);
  } catch (error) { next(error); }
};

const getAdminRegisters = async (req, res, next) => {
  try {
    const active = req.query.status === undefined ? undefined : req.query.status === "active";
    if (req.query.status !== undefined && !["active", "disabled", "all"].includes(req.query.status)) return res.status(422).json({ code: "INVALID_STATUS", message: "Estado inválido" });
    const registers = await cashRegisterService.getAdminRegisters(req.user.clinicId, active === undefined || req.query.status === "all" ? undefined : active);
    res.json({ success: true, data: registers });
  } catch (error) { next(error); }
};

const getAdminRegister = async (req, res, next) => {
  try { res.json({ success: true, data: await cashRegisterService.getAdminRegister(Number(req.params.id), req.user.clinicId) }); } catch (error) { next(error); }
};

const createAdminRegister = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await cashRegisterService.createAdminRegister({ ...req.body, clinicId: req.user.clinicId }) }); } catch (error) { next(error); }
};

const updateAdminRegister = async (req, res, next) => {
  try { res.json({ success: true, data: await cashRegisterService.updateAdminRegister(Number(req.params.id), req.user.clinicId, req.body) }); } catch (error) { next(error); }
};

const updateAdminRegisterStatus = async (req, res, next) => {
  try { res.json({ success: true, data: await cashRegisterService.updateAdminRegisterStatus(Number(req.params.id), req.user.clinicId, req.body.isActive) }); } catch (error) { next(error); }
};

/**
 * POST /cash-registers/shifts/:shiftId/movements
 */
const createMovement = async (
  req,
  res,
  next
) => {
  try {
    const clinicId = req.user.clinicId;
    const userId = req.user.id;

    const cashShiftId =
      Number(req.params.shiftId);

    const {
      type,
      amount,
      reason,
      notes,
    } = req.body;

    const movement =
      await cashRegisterService.createMovement({
        cashShiftId,
        clinicId,
        userId,
        type,
        amount,
        reason,
        notes,
      });

    res.status(201).json({
      success: true,
      data: movement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /cash-registers/shifts/:shiftId/close
 */
const closeShift = async (
  req,
  res,
  next
) => {
  try {
    const clinicId = req.user.clinicId;

    const cashShiftId =
      Number(req.params.shiftId);

    const {
      countedAmount,
      closingNotes,
      differenceReason,
    } = req.body;

    const shift =
      await cashRegisterService.closeShift({
        cashShiftId,
        clinicId,
        countedAmount,
        closingNotes,
        differenceReason,
      });

    res.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRegisters,
  getRegister,
  createRegister,
  updateRegister,

  openShift,
  getCurrentShift,
  getShift,
  getMovements,
  getAdminSummary,
  getAdminShifts,
  getAdminShift,
  getAdminMovements,
  createAdminAdjustment,
  getAdminRegisters,
  getAdminRegister,
  createAdminRegister,
  updateAdminRegister,
  updateAdminRegisterStatus,
  createMovement,
  closeShift,
};
