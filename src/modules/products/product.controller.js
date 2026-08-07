const service = require('./product.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.clinicId);
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

module.exports = { create, getAll, getById, update, remove };
