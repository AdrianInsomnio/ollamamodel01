// src/modules/cash/routes/cashregister.routes.js

const express = require("express");

const { getRegister, getRegisters, createRegister, updateRegister, openShift, getCurrentShift, getShift, getMovements, createMovement, closeShift, getAdminSummary, getAdminShifts, getAdminShift, getAdminMovements, createAdminAdjustment, getAdminRegisters, getAdminRegister, createAdminRegister, updateAdminRegister, updateAdminRegisterStatus } = require("./cashregister.controller");

const { authMiddleware, authorize } = require('../../../core/middlewares');
const { ROLES } = require('../../../core/constants/roles');
const idempotency = require('../../../core/idempotency/idempotency.middleware');


const router = express.Router();

/**
 * Todas las rutas requieren autenticación
 */
router.use(authMiddleware);

const adminOnly = authorize(ROLES.ADMIN);
router.get("/admin/summary", adminOnly, getAdminSummary);
router.get("/admin/shifts", adminOnly, getAdminShifts);
router.get("/admin/shifts/:id", adminOnly, getAdminShift);
router.get("/admin/movements", adminOnly, getAdminMovements);
router.post("/admin/shifts/:id/adjustment", adminOnly, createAdminAdjustment);
router.get("/admin/registers", adminOnly, getAdminRegisters);
router.get("/admin/registers/:id", adminOnly, getAdminRegister);
router.post("/admin/registers", adminOnly, createAdminRegister);
router.patch("/admin/registers/:id", adminOnly, updateAdminRegister);
router.patch("/admin/registers/:id/status", adminOnly, updateAdminRegisterStatus);

/**
 * ============================
 * CASH REGISTERS
 * ============================
 */

/**
 * Listar cajas de la clínica
 */
router.get("/", authorize(ROLES.ADMIN, ROLES.USER, ROLES.SUPER_ADMIN), getRegisters);

/**
 * Crear caja
 */
router.post("/", authorize(ROLES.ADMIN), createRegister);

/**
 * Obtener caja
 */
router.get("/:id", authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), getRegister);

/**
 * Modificar caja
 */
router.patch("/:id", authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), updateRegister);

/**
 * ============================
 * CASH SHIFTS
 * ============================
 */

/**
 * Abrir turno
 */
router.post("/:id/shifts", authorize(ROLES.ADMIN, ROLES.USER), idempotency("POST /api/cash/:id/shifts"), openShift);

/**
 * Obtener turno actualmente abierto
 */
router.get("/:id/current-shift", authorize(ROLES.ADMIN, ROLES.USER), getCurrentShift);

router.get("/shifts/:shiftId", authorize(ROLES.ADMIN, ROLES.USER), getShift);
router.get("/shifts/:shiftId/movements", authorize(ROLES.ADMIN, ROLES.USER), getMovements);

/**
 * ============================
 * CASH MOVEMENTS
 * ============================
 */

/**
 * Registrar entrada/salida/ajuste
 */
router.post("/shifts/:shiftId/movements", authorize(ROLES.ADMIN, ROLES.USER), idempotency("POST /api/cash/shifts/:shiftId/movements"), createMovement);

/**
 * ============================
 * CLOSE SHIFT
 * ============================
 */

/**
 * Cerrar turno
 */
router.post("/shifts/:shiftId/close", authorize(ROLES.ADMIN, ROLES.USER), idempotency("POST /api/cash/shifts/:shiftId/close"), closeShift);

module.exports = router;
