const service = require('./category.service');

const getAll = async (req, res, next) => {
  try { res.json({ categories: await service.getAll(req.user.clinicId) }); } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try { res.status(201).json({ category: await service.create(req.body, req.user.clinicId) }); } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try { res.json({ category: await service.update(Number(req.params.id), req.user.clinicId, req.body) }); } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try { res.json({ category: await service.updateStatus(Number(req.params.id), req.user.clinicId, req.body.isActive) }); } catch (error) { next(error); }
};

module.exports = { getAll, create, update, updateStatus };
