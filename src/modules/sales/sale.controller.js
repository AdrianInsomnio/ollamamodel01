const service = require('./sale.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const items = await service.getAll(req.user.organizationId);
    res.json({ sales: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.organizationId);
    res.json({ sale: item });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById };
