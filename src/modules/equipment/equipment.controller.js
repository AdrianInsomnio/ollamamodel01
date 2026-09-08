const service = require('./equipment.service');

const create = async (req, res, next) => {
  try { res.status(201).json({ equipment: await service.create(req.body, req.user.clinicId) }); } catch (error) { next(error); }
};

const getAll = async (req, res, next) => {
  try { res.json({ equipment: await service.getAll(req.user.clinicId) }); } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try { res.json({ equipment: await service.update(Number(req.params.id), req.user.clinicId, req.body) }); } catch (error) { next(error); }
};

module.exports = { create, getAll, update };
