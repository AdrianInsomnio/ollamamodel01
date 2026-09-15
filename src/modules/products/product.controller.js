const service = require('./product.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.clinicId, req.user.role);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const items = await service.getAll(req.user.clinicId);
    res.json({ products: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.clinicId);
    res.json({ product: item });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.update(parseInt(req.params.id), req.user.clinicId, req.body);
    res.json({ product: item });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(parseInt(req.params.id), req.user.clinicId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const item = await service.update(Number(req.params.id), req.user.clinicId, {
      isActive: req.body.isActive,
      ...(req.body.isActive === false ? { discontinuedAt: new Date() } : { discontinuedAt: null }),
    });
    res.json({ product: item });
  } catch (error) { next(error); }
};

const adjustStock = async (req, res, next) => {
  try {
    const item = await service.adjustStock(Number(req.params.id), Number(req.body.quantity), req.body.reason, req.user.clinicId, req.body.notes);
    res.json(item);
  } catch (error) { next(error); }
};

const getStockMovements = async (req, res, next) => {
  try {
    res.json({ movements: await service.getStockMovements(Number(req.params.id), req.user.clinicId) });
  } catch (error) { next(error); }
};

module.exports = { create, getAll, getById, update, updateStatus, adjustStock, getStockMovements, remove };
