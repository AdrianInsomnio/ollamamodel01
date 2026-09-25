const service = require('./consultation.service');

const create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user.clinicId, req.user);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const items = ['VET', 'VETERINARIAN'].includes(req.user.role)
      ? (await service.getMine(req.user.clinicId, req.user.id, {})).items
      : await service.getAll(req.user.clinicId);
    res.json({ consultations: items });
  } catch (error) {
    next(error);
  }
};

const getMine = async (req, res, next) => {
  try {
    const result = await service.getMine(req.user.clinicId, req.user.id, {
      search: typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
      patient: typeof req.query.patient === 'string' ? req.query.patient.trim() : undefined,
      client: typeof req.query.client === 'string' ? req.query.client.trim() : undefined,
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ consultations: result.items, pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    }});
  } catch (error) {
    next(error);
  }
};

const getVeterinarianAvailability = async (req, res, next) => {
  try {
    res.json({ veterinarians: await service.getVeterinarianAvailability(req.user.clinicId) });
  } catch (error) {
    next(error);
  }
};

const setVeterinarianAvailability = async (req, res, next) => {
  try {
    await service.setVeterinarianAvailability(req.user.clinicId, req.user, req.body.available, req.body.durationMinutes);
    res.json({ available: req.body.available });
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

const start = async (req, res, next) => {
  try {
    const consultation = await service.start(Number(req.params.id), req.user.clinicId, req.user);
    res.json({ consultation });
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
    const result = await service.close(parseInt(req.params.id), req.user.clinicId, req.body, req.user);
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
  getMine,
  getVeterinarianAvailability,
  setVeterinarianAvailability,
  getAll,
  getQueue,
  getById,
  start,
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
