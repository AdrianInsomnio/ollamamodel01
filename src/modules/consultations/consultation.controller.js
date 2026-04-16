const service = require('./consultation.service');

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
    res.json({ consultations: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.organizationId);
    res.json({ consultation: item });
  } catch (error) {
    next(error);
  }
};

const getPetHistory = async (req, res, next) => {
  try {
    const result = await service.getPetHistory(parseInt(req.params.petId), req.user.organizationId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getClientConsultations = async (req, res, next) => {
  try {
    const consultations = await service.getClientConsultations(parseInt(req.params.clientId), req.user.organizationId);
    res.json({ consultations });
  } catch (error) {
    next(error);
  }
};

const addDiagnosis = async (req, res, next) => {
  try {
    const item = await service.addDiagnosis(parseInt(req.params.id), req.user.organizationId, req.body.description);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const addTreatment = async (req, res, next) => {
  try {
    const item = await service.addTreatment(parseInt(req.params.id), req.user.organizationId, req.body.description);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const addPrescription = async (req, res, next) => {
  try {
    const item = await service.addPrescription(parseInt(req.params.id), req.user.organizationId, req.body.description);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.update(parseInt(req.params.id), req.user.organizationId, req.body);
    res.json({ consultation: item });
  } catch (error) {
    next(error);
  }
};

const close = async (req, res, next) => {
  try {
    const result = await service.close(parseInt(req.params.id), req.user.organizationId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getById,
  getPetHistory,
  getClientConsultations,
  update,
  addDiagnosis,
  addTreatment,
  addPrescription,
  close
};
