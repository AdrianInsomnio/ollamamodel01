const service = require('./appointment.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.clinicId);
    res.status(201).json({ appointment: item });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const items = await service.getAll(req.user.clinicId);
    res.json({ appointments: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(req.params.id, req.user.clinicId);
    res.json({ appointment: item });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.update(req.params.id, req.body, req.user.clinicId);
    res.json({ appointment: item });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.clinicId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const slots = await service.getAvailableSlots(req.query.date, req.user.clinicId);
    res.json({ slots });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const appointment = await service.updateStatus(req.params.id, req.body.status, req.user.clinicId);
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getAvailableSlots,
  updateStatus,
};
