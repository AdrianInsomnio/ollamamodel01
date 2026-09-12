const service = require('./consultation.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.clinicId);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const items = await service.getAll(req.user.clinicId);
    res.json({ consultations: items });
  } catch (error) {
    next(error);
  }
};

const getQueue = async (req, res, next) => {
  try {
    const items = await service.getQueue(req.user.clinicId);
    res.json({ consultations: items });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await service.getById(parseInt(req.params.id), req.user.clinicId);
    res.json({ consultation: item });
  } catch (error) {
    next(error);
  }
};

const getPetHistory = async (req, res, next) => {
  try {
    const result = await service.getPetHistory(parseInt(req.params.petId), req.user.clinicId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getClientConsultations = async (req, res, next) => {
  try {
    const consultations = await service.getClientConsultations(parseInt(req.params.clientId), req.user.clinicId);
    res.json({ consultations });
  } catch (error) {
    next(error);
  }
};

const addDiagnosis = async (req, res, next) => {
  try {
    const item = await service.addDiagnosis(parseInt(req.params.id), req.user.clinicId, req.body.description);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const addTreatment = async (req, res, next) => {
  try {
    const item = await service.addTreatment(parseInt(req.params.id), req.user.clinicId, req.body.description);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const addPrescription = async (req, res, next) => {
  try {
    const item = await service.addPrescription(parseInt(req.params.id), req.user.clinicId, req.body.description);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await service.update(parseInt(req.params.id), req.user.clinicId, req.body);
    res.json({ consultation: item });
  } catch (error) {
    next(error);
  }
};

const close = async (req, res, next) => {
  try {
    const result = await service.close(parseInt(req.params.id), req.user.clinicId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const assignConsultorio = async (req, res, next) => {
  try {
    const item = await service.assignConsultorio(
      Number(req.params.id),
      req.user.clinicId,
      req.body.consultorioId,
      req.body.startAt,
      req.body.endAt
    );
    res.json({ consultation: item });
  } catch (error) {
    next(error);
  }
};

const releaseConsultorio = async (req, res, next) => {
  try {
    const item = await service.releaseConsultorio(Number(req.params.id), req.user.clinicId);
    res.json({ consultation: item });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(Number(req.params.id), req.user.clinicId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getQueue,
  getById,
  getPetHistory,
  getClientConsultations,
  update,
  addDiagnosis,
  addTreatment,
  addPrescription,
  close,
  assignConsultorio,
  releaseConsultorio,
  remove
};
