const service = require('./prescription.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.organizationId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getByConsultationId = async (req, res, next) => {
  try {
    const items = await service.getByConsultationId(parseInt(req.params.consultationId), req.user.organizationId);
    res.json({ prescriptions: items });
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

module.exports = { create, getByConsultationId, remove };
