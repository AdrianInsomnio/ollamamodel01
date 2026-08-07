const service = require('./sale.service');

const create = async (req, res, next) => {
  try {
    // createSale aplica todas las validaciones (cliente, stock, IVA, transaccion).
    const item = await service.createSale(req.body, req.user.clinicId);
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

module.exports = { create, getAll, getById };
