const repository = require('./printing.repository');
const { AppError } = require('../../core/errors/AppError');

const PAPER_TYPES = new Set(['THERMAL', 'SHEET']);
const PAPER_SIZES = new Set(['THERMAL_58', 'THERMAL_80', 'A4', 'LETTER', 'A5', 'LEGAL', 'CUSTOM']);

const requireName = (value, field) => {
  if (!value || typeof value !== 'string' || !value.trim()) throw new AppError(`${field} es obligatorio`, 400, 'VALIDATION_ERROR');
};
const requireDocumentId = (value) => {
  if (value === undefined || value === null || value === '') throw new AppError('sourceDocumentId es obligatorio', 400, 'VALIDATION_ERROR');
};

const assertPaper = (paperType, paperSize) => {
  if (!PAPER_TYPES.has(paperType)) throw new AppError('paperType no soportado', 400, 'VALIDATION_ERROR');
  if (!PAPER_SIZES.has(paperSize)) throw new AppError('paperSize no soportado', 400, 'VALIDATION_ERROR');
  if (paperType === 'THERMAL' && !paperSize.startsWith('THERMAL_')) throw new AppError('El papel térmico requiere tamaño THERMAL_58 o THERMAL_80', 400, 'PRINT_PAPER_INVALID');
  if (paperType === 'SHEET' && paperSize.startsWith('THERMAL_')) throw new AppError('El papel de hoja no puede usar tamaño térmico', 400, 'PRINT_PAPER_INVALID');
};

const createLocation = async (data, clinicId) => {
  requireName(data.name, 'name');
  return repository.createLocation({ name: data.name.trim(), code: data.code || null }, clinicId);
};

const createAgent = async (data, clinicId) => {
  requireName(data.name, 'name');
  if (data.locationId && !await repository.findLocation(data.locationId, clinicId)) throw new AppError('locationId no autorizado', 403, 'PRINT_SCOPE_VIOLATION');
  return repository.createAgent({
    name: data.name.trim(), endpoint: data.endpoint || null, locationId: data.locationId || null,
    apiKeyHash: data.apiKeyHash || null, status: data.status || 'OFFLINE'
  }, clinicId);
};

const createProfile = async (data, clinicId) => {
  requireName(data.name, 'name');
  if (!data.printerType || !Array.isArray(data.paperTypes) || !data.capabilities || typeof data.capabilities !== 'object') {
    throw new AppError('printerType, paperTypes y capabilities son obligatorios', 400, 'VALIDATION_ERROR');
  }
  return repository.createProfile({ name: data.name.trim(), printerType: data.printerType, paperTypes: data.paperTypes, capabilities: data.capabilities }, clinicId);
};

const createPrinter = async (data, clinicId) => {
  requireName(data.name, 'name');
  if (!data.locationId || !data.printerType) throw new AppError('locationId y printerType son obligatorios', 400, 'VALIDATION_ERROR');
  assertPaper(data.paperType, data.paperSize);
  const location = await repository.findLocation(data.locationId, clinicId);
  if (!location) throw new AppError('locationId no autorizado', 403, 'PRINT_SCOPE_VIOLATION');
  if (data.printAgentId && !await repository.findAgent(data.printAgentId, clinicId)) throw new AppError('printAgentId no autorizado', 403, 'PRINT_SCOPE_VIOLATION');
  if (data.profileId && !await repository.findProfile(data.profileId, clinicId)) throw new AppError('profileId no autorizado', 403, 'PRINT_SCOPE_VIOLATION');
  return repository.createPrinter({
    name: data.name.trim(), locationId: data.locationId, printAgentId: data.printAgentId || null,
    profileId: data.profileId || null, printerType: data.printerType, paperType: data.paperType,
    paperSize: data.paperSize, orientation: data.orientation || 'PORTRAIT'
  }, clinicId);
};

const createTarget = async (data, clinicId) => {
  requireName(data.code, 'code');
  requireName(data.name, 'name');
  if (!data.locationId) throw new AppError('locationId es obligatorio', 400, 'VALIDATION_ERROR');
  const location = await repository.findLocation(data.locationId, clinicId);
  if (!location) throw new AppError('locationId no autorizado', 403, 'PRINT_SCOPE_VIOLATION');
  if (data.printerId) {
    const printer = await repository.findPrinter(data.printerId, clinicId);
    if (!printer || printer.locationId !== data.locationId) throw new AppError('printerId no autorizado para la ubicación', 403, 'PRINT_SCOPE_VIOLATION');
  }
  return repository.createTarget({ code: data.code.trim().toUpperCase(), name: data.name.trim(), locationId: data.locationId, printerId: data.printerId || null }, clinicId);
};

const createTemplate = async (data, clinicId) => {
  requireName(data.templateKey, 'templateKey');
  requireName(data.name, 'name');
  requireName(data.documentType, 'documentType');
  return repository.createTemplate({ templateKey: data.templateKey.trim(), name: data.name.trim(), documentType: data.documentType.trim() }, clinicId);
};

const createTemplateVersion = async (data, clinicId) => {
  if (!data.templateId || !Number.isInteger(data.version) || data.version < 1) throw new AppError('templateId y version válida son obligatorios', 400, 'VALIDATION_ERROR');
  assertPaper(data.paperType, data.paperSize);
  if (!data.definition || typeof data.definition !== 'object' || Array.isArray(data.definition)) throw new AppError('definition debe ser un objeto JSON', 400, 'VALIDATION_ERROR');
  const template = await repository.findTemplate(data.templateId, clinicId);
  if (!template) throw new AppError('Template no encontrado o no autorizado', 404, 'PRINT_TEMPLATE_NOT_FOUND');
  return repository.createTemplateVersion({
    templateId: data.templateId, version: data.version, status: data.status || 'DRAFT',
    paperType: data.paperType, paperSize: data.paperSize, orientation: data.orientation || 'PORTRAIT', definition: data.definition
  });
};

const createAsset = async (data, clinicId) => {
  requireName(data.name, 'name');
  requireName(data.storageKey, 'storageKey');
  requireName(data.mimeType, 'mimeType');
  return repository.createAsset({ name: data.name.trim(), storageKey: data.storageKey.trim(), mimeType: data.mimeType.trim(), width: data.width || null, height: data.height || null }, clinicId);
};

const buildContract = ({ clinic, sourceDocumentType, sourceDocumentId, variant, target, printer, templateVersion, data }) => ({
  version: 1,
  document: {
    type: sourceDocumentType,
    number: data.documentNumber == null ? String(sourceDocumentId) : String(data.documentNumber),
    variant,
    source: { system: 'OLLModel', type: sourceDocumentType, id: String(sourceDocumentId) }
  },
  template: { id: String(templateVersion.template.id), version: templateVersion.version },
  output: {
    targetId: target.code,
    paper: { type: printer.paperType, size: printer.paperSize, orientation: printer.orientation }
  },
  business: { id: String(clinic.id), name: clinic.name },
  customer: data.customer || null,
  items: Array.isArray(data.items) ? data.items : [],
  totals: data.totals || {},
  payments: Array.isArray(data.payments) ? data.payments : [],
  footer: data.footer || {},
  context: data.context || {}
});

const createBatch = async (data, clinicId, requestedById) => {
  requireName(data.sourceDocumentType, 'sourceDocumentType');
  requireDocumentId(data.sourceDocumentId);
  if (!Array.isArray(data.jobs) || data.jobs.length === 0) throw new AppError('Debe existir al menos un PrintJob', 400, 'PRINT_JOBS_REQUIRED');
  const clinic = await repository.findClinic(clinicId);
  if (!clinic) throw new AppError('Clínica no encontrada', 404, 'CLINIC_NOT_FOUND');
  const variant = data.variant || 'ORIGINAL';
  const jobs = [];
  for (const input of data.jobs) {
    const target = await repository.findTarget(input.targetId, clinicId);
    if (!target || !target.printer) throw new AppError('PrintTarget sin impresora activa o no autorizado', 409, 'PRINT_TARGET_UNAVAILABLE');
    const printer = target.printer;
    const templateVersion = await repository.findTemplateVersion(input.templateVersionId, clinicId);
    if (!templateVersion || templateVersion.status !== 'ACTIVE') throw new AppError('TemplateVersion activa no encontrada o no autorizada', 409, 'PRINT_TEMPLATE_UNAVAILABLE');
    if (templateVersion.paperType !== printer.paperType || templateVersion.paperSize !== printer.paperSize) {
      throw new AppError('Template y printer incompatibles', 409, 'PRINT_INCOMPATIBLE');
    }
    const contract = buildContract({ clinic, sourceDocumentType: data.sourceDocumentType, sourceDocumentId: data.sourceDocumentId, variant, target, printer, templateVersion, data: { ...data, ...input } });
    jobs.push({
      clinicId, originalJobId: input.originalJobId || null, targetId: target.id, printerId: printer.id,
      printAgentId: printer.printAgentId || null, templateVersionId: templateVersion.id,
      documentType: data.sourceDocumentType, documentNumber: contract.document.number, variant,
      contractVersion: contract.version, contractSnapshot: contract, attemptCount: 0
    });
  }
  return repository.createBatch({ ...data, clinicId, requestedById, variant, jobs });
};

  const listBatches = (clinicId, take) => repository.listBatches(clinicId, Math.min(Number(take) || 50, 100));

  const JOB_TRANSITIONS = {
    SENT: new Set(['PENDING', 'RETRYING']),
    PRINTED: new Set(['SENT']),
    FAILED: new Set(['PENDING', 'SENT', 'RETRYING']),
    RETRYING: new Set(['FAILED']),
    CANCELLED: new Set(['PENDING', 'FAILED', 'RETRYING'])
  };

  const recalculateBatch = async (batchId, clinicId) => {
    const batch = await repository.findBatch(batchId, clinicId);
    if (!batch) throw new AppError('PrintBatch no encontrado', 404, 'PRINT_BATCH_NOT_FOUND');
    const statuses = batch.jobs.map((job) => job.status);
    let status = 'PENDING';
    if (statuses.length && statuses.every((value) => value === 'PRINTED')) status = 'COMPLETED';
    else if (statuses.some((value) => value === 'PRINTED') && statuses.some((value) => ['FAILED', 'CANCELLED'].includes(value))) status = 'PARTIAL';
    else if (statuses.length && statuses.every((value) => ['FAILED', 'CANCELLED'].includes(value))) status = 'FAILED';
    else if (statuses.some((value) => ['SENT', 'RETRYING'].includes(value))) status = 'PROCESSING';
    await repository.updateBatchStatus(batchId, clinicId, status);
    return { ...batch, status };
  };

  const transitionJob = async (jobId, clinicId, nextStatus, details = {}) => {
    const job = await repository.findJob(jobId, clinicId);
    if (!job) throw new AppError('PrintJob no encontrado', 404, 'PRINT_JOB_NOT_FOUND');
    if (job.status === nextStatus) return recalculateBatch(job.batchId, clinicId);
    if (!JOB_TRANSITIONS[nextStatus]?.has(job.status)) throw new AppError(`No se puede cambiar PrintJob de ${job.status} a ${nextStatus}`, 409, 'PRINT_INVALID_TRANSITION');
    const data = { status: nextStatus };
    if (nextStatus === 'SENT') data.sentAt = new Date();
    if (nextStatus === 'PRINTED') data.printedAt = new Date();
    if (nextStatus === 'FAILED') data.lastError = String(details.error || 'Error de impresión').slice(0, 10000);
    if (nextStatus === 'RETRYING') { data.attemptCount = { increment: 1 }; data.lastError = null; }
    await repository.updateJob(jobId, clinicId, data);
    return recalculateBatch(job.batchId, clinicId);
  };

  const markJobSent = (jobId, clinicId) => transitionJob(jobId, clinicId, 'SENT');
  const markJobPrinted = (jobId, clinicId) => transitionJob(jobId, clinicId, 'PRINTED');
  const markJobFailed = (jobId, clinicId, details) => transitionJob(jobId, clinicId, 'FAILED', details);
  const retryJob = (jobId, clinicId) => transitionJob(jobId, clinicId, 'RETRYING');
  const cancelJob = (jobId, clinicId) => transitionJob(jobId, clinicId, 'CANCELLED');

module.exports = {
  createLocation, createAgent, createProfile, createPrinter, createTarget,
  createTemplate, createTemplateVersion, createAsset, createBatch, listBatches,
    buildContract, recalculateBatch, markJobSent, markJobPrinted, markJobFailed, retryJob, cancelJob,
  listLocations: repository.listLocations, listAgents: repository.listAgents, listProfiles: repository.listProfiles,
  listPrinters: repository.listPrinters, listTargets: repository.listTargets, listTemplates: repository.listTemplates,
  listAssets: repository.listAssets
};
