const service = require('./appointment.service');

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
    res.json({ appointments: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.organizationId);
    res.json({ appointment: item });
  } catch (error) {
    next(error);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Valid date is required' });
    }

    const slots = await service.getAvailableSlots(date, req.user.organizationId);
    res.json({ slots });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const item = await service.updateStatus(parseInt(req.params.id), req.user.organizationId, req.body.status);
    res.json({ appointment: item });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.update(parseInt(req.params.id), req.user.organizationId, req.body);
    res.json({ appointment: item });
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

module.exports = { create, getAll, getById, getAvailableSlots, updateStatus, update, remove };
