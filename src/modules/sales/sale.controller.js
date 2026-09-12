const service = require('./sale.service');

const create = async (req, res, next) => {
  try {
    // createSale aplica todas las validaciones (cliente, stock, IVA, transaccion).
    const item = await service.createSale({ ...req.body, userId: req.user.id }, req.user.clinicId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const items = await service.getAll(req.user.clinicId);
    res.json({ sales: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.clinicId);
    res.json({ sale: item });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.updateSale(parseInt(req.params.id), req.body, req.user.clinicId, req.user.id);
    res.json(item);
  } catch (error) {
    next(error);
  }
};

const hold = async (req, res, next) => {
  try {
    const sale = await service.holdSale(req.body, req.user.clinicId, req.user.id);
    res.status(201).json({ sale });
  } catch (error) {
    next(error);
  }
};

const getHeld = async (req, res, next) => {
  try {
    const sales = await service.getHeldSales(Number(req.query.cashShiftId), req.user.clinicId, req.user.id);
    res.json({ sales });
  } catch (error) {
    next(error);
  }
};

const resume = async (req, res, next) => {
  try {
    const sale = await service.resumeHeldSale(parseInt(req.params.id), req.user.clinicId, req.user.id);
    res.json({ sale });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const item = await service.cancelSale(parseInt(req.params.id), req.user.clinicId, req.user.id, req.body?.reason || req.body?.motivo);
    res.json(item);
  } catch (error) {
    next(error);
  }
};

const print = async (req, res, next) => {
  try {
    const result = await service.printSale(parseInt(req.params.id), req.user.clinicId, req.user.id, req.body?.reason || req.body?.motivo);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const printHistory = async (req, res, next) => {
  try {
    const prints = await service.getPrintHistory(parseInt(req.params.id), req.user.clinicId);
    res.json({ prints });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, hold, getHeld, resume, getAll, getById, update, cancel, print, printHistory };
