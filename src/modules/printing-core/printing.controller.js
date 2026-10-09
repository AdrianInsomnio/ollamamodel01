const service = require('./printing.service');
const { AppError } = require('../../core/errors/AppError');

const clinicIdFromRequest = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    const value = req.query.clinicId ?? req.body?.clinicId;
    const clinicId = Number(value);
    if (!Number.isInteger(clinicId) || clinicId <= 0) throw new AppError('SUPER_ADMIN debe indicar clinicId', 400, 'CLINIC_REQUIRED');
    return clinicId;
  }
  if (!req.user.clinicId) throw new AppError('El usuario no tiene clínica asignada', 403, 'NO_CLINIC_ASSIGNED');
  return req.user.clinicId;
};

const wrap = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

const create = (method) => wrap(async (req, res) => res.status(201).json(await service[method](req.body, clinicIdFromRequest(req))));
const list = (method) => wrap(async (req, res) => res.json(await service[method](clinicIdFromRequest(req), req.query)));

  const createBatch = wrap(async (req, res) => res.status(201).json(await service.createBatch(req.body, clinicIdFromRequest(req), req.user.id)));
  const jobAction = (method) => wrap(async (req, res) => res.json(await service[method](Number(req.params.jobId), clinicIdFromRequest(req), req.body)));
  const activateTemplateVersion = wrap(async (req, res) => res.json(await service.activateTemplateVersion(Number(req.params.versionId), clinicIdFromRequest(req))));
  const deleteDraftTemplateVersion = wrap(async (req, res) => res.json(await service.deleteDraftTemplateVersion(Number(req.params.versionId), clinicIdFromRequest(req))));
  const deactivateResource = wrap(async (req, res) => res.json(await service.deactivateResource(req.params.resource, req.params.resourceId, clinicIdFromRequest(req))));
  const updateResource = wrap(async (req, res) => res.json(await service.updateResource(req.params.resource, req.params.resourceId, req.body, clinicIdFromRequest(req))));

module.exports = {
  clinicIdFromRequest,
  createLocation: create('createLocation'), listLocations: list('listLocations'),
  createAgent: create('createAgent'), listAgents: list('listAgents'),
  createProfile: create('createProfile'), listProfiles: list('listProfiles'),
  createPrinter: create('createPrinter'), listPrinters: list('listPrinters'),
  createTarget: create('createTarget'), listTargets: list('listTargets'),
  createTemplate: create('createTemplate'), listTemplates: list('listTemplates'),
  createRule: create('createRule'), listRules: list('listRules'),
    createTemplateVersion: create('createTemplateVersion'), activateTemplateVersion, deleteDraftTemplateVersion, deactivateResource, updateResource,
  createAsset: create('createAsset'), listAssets: list('listAssets'),
    createBatch, listBatches: list('listBatches'),
    markJobSent: jobAction('markJobSent'), markJobPrinted: jobAction('markJobPrinted'),
    markJobFailed: jobAction('markJobFailed'), retryJob: jobAction('retryJob'), cancelJob: jobAction('cancelJob')
};
