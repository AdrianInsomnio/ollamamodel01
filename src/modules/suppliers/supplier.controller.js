const service = require('./supplier.service');

const list = async (req, res, next) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    res.json({ suppliers: await service.list(req.user.clinicId, activeOnly) });
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    res.status(201).json({ supplier: await service.create(req.body, req.user.clinicId) });
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    res.json({ supplier: await service.update(Number(req.params.id), req.user.clinicId, req.body) });
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    res.json({ supplier: await service.updateStatus(Number(req.params.id), req.user.clinicId, req.body.isActive) });
  } catch (error) { next(error); }
};

module.exports = { list, create, update, updateStatus };
