const service = require('./diagnosis.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.clinicId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getByConsultationId = async (req, res, next) => {
  try {
    const items = await service.getByConsultationId(parseInt(req.params.consultationId), req.user.clinicId);
    res.json({ diagnoses: items });
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

module.exports = { create, getByConsultationId, remove };
