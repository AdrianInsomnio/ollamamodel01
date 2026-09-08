const service = require('./consultorio.service');

const create = async (req, res, next) => {
  try { res.status(201).json({ consultorio: await service.create(req.body, req.user.clinicId) }); } catch (error) { next(error); }
};

const getAll = async (req, res, next) => {
  try { res.json({ consultorios: await service.getAll(req.user.clinicId) }); } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try { res.json({ consultorio: await service.getById(Number(req.params.id), req.user.clinicId) }); } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try { res.json({ consultorio: await service.update(Number(req.params.id), req.user.clinicId, req.body) }); } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try { res.json({ consultorio: await service.updateStatus(Number(req.params.id), req.user.clinicId, req.body.status) }); } catch (error) { next(error); }
};

const getAvailable = async (req, res, next) => {
  try { res.json({ consultorios: await service.getAvailable(req.user.clinicId, req.query.startAt, req.query.endAt) }); } catch (error) { next(error); }
};

const addEquipment = async (req, res, next) => {
  try { res.status(201).json({ equipment: await service.addEquipment(Number(req.params.id), req.user.clinicId, req.body) }); } catch (error) { next(error); }
};

const updateEquipment = async (req, res, next) => {
  try { res.json({ equipment: await service.updateEquipment(Number(req.params.id), Number(req.params.equipmentId), req.user.clinicId, req.body) }); } catch (error) { next(error); }
};

const removeEquipment = async (req, res, next) => {
  try { await service.removeEquipment(Number(req.params.id), Number(req.params.equipmentId), req.user.clinicId); res.status(204).send(); } catch (error) { next(error); }
};

module.exports = { create, getAll, getById, update, updateStatus, getAvailable, addEquipment, updateEquipment, removeEquipment };
