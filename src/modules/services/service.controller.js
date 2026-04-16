const service = require('./service.service');

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
    res.json({ services: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.organizationId);
    res.json({ service: item });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.update(parseInt(req.params.id), req.user.organizationId, req.body);
    res.json({ service: item });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(parseInt(req.params.id), req.user.organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, remove };
