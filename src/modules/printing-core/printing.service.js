const repository = require('./printing.repository');
const axios = require('axios');
const { AppError } = require('../../core/errors/AppError');

const PAPER_TYPES = new Set(['THERMAL', 'SHEET']);
const PAPER_SIZES = new Set(['THERMAL_58', 'THERMAL_80', 'A4', 'LETTER', 'A5', 'LEGAL', 'CUSTOM']);
const CONNECTED_PRINT_EVENTS = new Set(['SALE', 'CANCELLATION']);

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
  try {
    return await repository.createLocation({ name: data.name.trim(), code: data.code || null }, clinicId);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError(`Ya existe una ubicación con el código "${data.code}" para esta clínica`, 409, 'LOCATION_CODE_DUPLICATED');
    throw error;
  }
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
   // paperSize: data.//Fixed typo
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
  try {
    return await repository.createTemplate({ templateKey: data.templateKey.trim(), name: data.name.trim(), documentType: data.documentType.trim() }, clinicId);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError(`Ya existe un template con la clave "${data.templateKey}" para esta clínica`, 409, 'TEMPLATE_KEY_DUPLICATED');
    throw error;
  }
};

const deleteTemplate = async (templateId, clinicId) => {
  const id = Number(templateId);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('templateId no válido', 400, 'VALIDATION_ERROR');
  const result = await repository.deleteTemplate(id, clinicId);
  if (!result) throw new AppError('Template no encontrado o no autorizado', 404, 'PRINT_TEMPLATE_NOT_FOUND');
  if (result.linkedJobs) throw new AppError('No se puede eliminar la plantilla porque tiene trabajos de impresión asociados', 409, 'PRINT_TEMPLATE_IN_USE');
  return result;
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
    date: data.documentDate || null,
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

const listRules = async (clinicId) => {
  const rules = await repository.listRules(clinicId);
  return rules.map((rule) => {
    const legacyOutput = rule.outputs?.length === 1 ? rule.outputs[0] : null;
    return {
      ...rule,
      targetId: legacyOutput?.targetId ?? rule.targetId ?? null,
      templateKey: legacyOutput?.templateKey ?? rule.templateKey ?? null,
      priority: legacyOutput?.priority ?? rule.priority,
    };
  });
};

const normalizeRule = (data) => {
  const outputs = Array.isArray(data.outputs) ? data.outputs : (data.targetId && data.templateKey ? [{
    name: data.outputName || data.templateKey,
    targetId: data.targetId,
    templateKey: data.templateKey,
    priority: data.priority ?? 0,
    copies: data.copies ?? 1,
    isActive: data.outputIsActive ?? true,
  }] : []);
  requireName(data.name || data.event, 'name');
  requireName(data.event, 'event');
  if (!outputs.length) throw new AppError('La regla debe incluir al menos una salida', 400, 'PRINT_OUTPUTS_REQUIRED');
  return {
    name: String(data.name || data.event).trim(),
    event: data.event.trim(),
    isActive: data.isActive ?? true,
    priority: Number.isInteger(data.priority) ? data.priority : 0,
    outputs: outputs.map((output) => ({
      name: String(output.name || output.templateKey || '').trim(),
      targetId: Number(output.targetId),
      templateKey: String(output.templateKey || '').trim(),
      priority: Number.isInteger(output.priority) ? output.priority : 0,
      copies: output.copies ?? 1,
      isActive: output.isActive ?? true,
    })),
  };
};

const validateRuleOutputs = async (data, clinicId) => {
  if (data.isActive && data.outputs.some((output) => output.isActive) && !CONNECTED_PRINT_EVENTS.has(data.event)) {
    throw new AppError(`No existe un flujo de impresión conectado para el evento ${data.event}`, 400, 'PRINT_EVENT_UNSUPPORTED');
  }
  const outputRoutes = new Set();
  for (const output of data.outputs) {
    requireName(output.name, 'output.name');
    requireName(output.templateKey, 'output.templateKey');
    if (!Number.isInteger(output.targetId) || output.targetId <= 0) throw new AppError('Cada salida requiere un destino válido', 400, 'VALIDATION_ERROR');
    if (!Number.isInteger(output.copies) || output.copies < 1 || output.copies > 5) throw new AppError('Las copias deben estar entre 1 y 5', 400, 'VALIDATION_ERROR');
    if (!Number.isInteger(output.priority)) throw new AppError('La prioridad debe ser un entero', 400, 'VALIDATION_ERROR');
    const routeKey = `${output.targetId}:${output.templateKey}`;
    if (outputRoutes.has(routeKey)) throw new AppError('La regla ya contiene una salida con la misma plantilla y destino', 409, 'PRINT_OUTPUT_DUPLICATED');
    outputRoutes.add(routeKey);

    let target = await repository.findTarget(output.targetId, clinicId);
    if (!target && !(data.isActive && output.isActive)) target = await repository.findTargetForRule(output.targetId, clinicId);
    if (!target) throw new AppError('Destino no encontrado o no autorizado', 403, 'PRINT_SCOPE_VIOLATION');
    let template = await repository.findTemplateByKey(output.templateKey, clinicId);
    if (!template && !(data.isActive && output.isActive)) template = await repository.findTemplateByKeyForRule(output.templateKey, clinicId);
    if (!template) throw new AppError('Plantilla no encontrada o no autorizada', 403, 'PRINT_SCOPE_VIOLATION');

    if (data.isActive && output.isActive) {
      if (!target.isActive) throw new AppError(`El destino "${target.name}" está inactivo`, 409, 'PRINT_TARGET_UNAVAILABLE');
      if (!template.isActive) throw new AppError(`La plantilla "${template.name}" está inactiva`, 409, 'PRINT_TEMPLATE_UNAVAILABLE');
      const activeVersion = await repository.findActiveTemplateVersionByKey(output.templateKey, clinicId);
      if (!activeVersion) throw new AppError(`La plantilla "${template.name}" no tiene una versión activa`, 409, 'PRINT_TEMPLATE_UNAVAILABLE');
      if (!target.printer) throw new AppError(`El destino "${target.name}" no tiene una impresora asignada`, 409, 'PRINT_TARGET_UNAVAILABLE');
      if (activeVersion.paperType !== target.printer.paperType || activeVersion.paperSize !== target.printer.paperSize) {
        throw new AppError(`La plantilla "${template.name}" no es compatible con la impresora de "${target.name}"`, 409, 'PRINT_INCOMPATIBLE');
      }
    }
  }
};

const createRule = async (input, clinicId) => {
  const data = normalizeRule(input);
  await validateRuleOutputs(data, clinicId);
  try {
    return await repository.createRule(data, clinicId);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('Ya existe una regla con esos datos', 409, 'PRINT_RULE_DUPLICATED');
    throw error;
  }
};

const updateRule = async (id, input, clinicId) => {
  const existing = (await repository.listRules(clinicId)).find((rule) => rule.id === id);
  if (!existing) throw new AppError('Regla de impresión no encontrada', 404, 'PRINT_RULE_NOT_FOUND');
  const payload = Array.isArray(input.outputs)
    ? normalizeRule(input)
    : normalizeRule({
      ...existing,
      ...input,
      outputs: existing.outputs.map((output, index) => index === 0 && (input.targetId !== undefined || input.templateKey !== undefined || input.outputName !== undefined || input.copies !== undefined || input.outputIsActive !== undefined)
        ? { ...output, targetId: input.targetId ?? output.targetId, templateKey: input.templateKey ?? output.templateKey, name: input.outputName ?? output.name, priority: input.priority ?? output.priority, copies: input.copies ?? output.copies, isActive: input.outputIsActive ?? output.isActive }
        : output)
    });
  await validateRuleOutputs(payload, clinicId);
  let result;
  try {
    result = await repository.updateRule(id, payload, clinicId);
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('Ya existe una regla con ese nombre para el evento', 409, 'PRINT_RULE_DUPLICATED');
    throw error;
  }
  if (!result.count) throw new AppError('Regla de impresión no encontrada', 404, 'PRINT_RULE_NOT_FOUND');
  return result.rule;
};

const deleteRule = async (id, clinicId) => {
  const result = await repository.deleteRule(id, clinicId);
  if (!result.count) throw new AppError('Regla de impresión no encontrada', 404, 'PRINT_RULE_NOT_FOUND');
  return { id, deleted: true };
};

const createBatchFromRules = async (event, data, clinicId, requestedById) => {
  const rules = await findRulesByEvent(clinicId, event);
  if (!rules.length) return null;

  const jobs = [];
  for (const rule of rules) {
    const target = await repository.findTarget(rule.targetId, clinicId);
    if (!target || !target.printer) continue;

    const printer = target.printer;
    const activeVersion = await repository.findActiveTemplateVersionByKey(rule.templateKey, clinicId);
    if (!activeVersion) continue;

    // Validar compatibilidad básica
    if (activeVersion.paperType !== printer.paperType || activeVersion.paperSize !== printer.paperSize) {
      console.warn(`Regla de impresión incompatible: Target ${target.name} vs Template ${activeVersion.template.name}`);
      continue;
    }

    jobs.push({
      targetId: target.id,
      printerId: printer.id,
      printAgentId: printer.printAgentId || null,
      templateVersionId: activeVersion.id,
      documentType: event,
      variant: 'ORIGINAL',
      contractSnapshot: {}
    });
  }

  if (!jobs.length) return null;

  return repository.createBatch({ 
    sourceDocumentType: event, 
    sourceDocumentId: data.id || 'N/A', 
    variant: 'ORIGINAL', 
    jobs 
  }, clinicId, requestedById);
};

const findRulesByEvent = async (clinicId, event) => {
  const rules = await repository.findRulesByEvent(clinicId, event);
  return rules.flatMap((rule) => {
    const outputs = rule.outputs?.length ? rule.outputs.filter((output) => output.isActive) : rule.targetId && rule.templateKey ? [{
      id: rule.id, name: rule.templateKey, targetId: rule.targetId, templateKey: rule.templateKey,
      priority: rule.priority, copies: 1, isActive: true,
    }] : [];
    return outputs.map((output) => ({
      ...output, ruleId: rule.id, ruleName: rule.name, event: rule.event,
      isActive: rule.isActive,
    }));
  }).sort((a, b) => a.priority - b.priority || a.id - b.id);
};

const createBatch = async (data, clinicId, requestedById) => {
// ... (rest of function remains same)
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
    const templateVersion = input.templateVersionId
      ? await repository.findTemplateVersion(input.templateVersionId, clinicId)
      : input.templateKey
        ? await repository.findActiveTemplateVersionByKey(input.templateKey, clinicId)
        : null;
    if (!templateVersion || templateVersion.status !== 'ACTIVE') throw new AppError('TemplateVersion activa no encontrada o no autorizada', 409, 'PRINT_TEMPLATE_UNAVAILABLE');
    if (templateVersion.paperType !== printer.paperType || templateVersion.paperSize !== printer.paperSize) {
      throw new AppError('Template y printer incompatibles', 409, 'PRINT_INCOMPATIBLE');
    }
    const contract = buildContract({ clinic, sourceDocumentType: data.sourceDocumentType, sourceDocumentId: data.sourceDocumentId, variant, target, printer, templateVersion, data: { ...data, ...input } });
    const definition = templateVersion.definition && typeof templateVersion.definition === 'object' ? templateVersion.definition : {};
    contract.template.layout = Array.isArray(definition.elements) ? definition.elements : Array.isArray(definition.layout) ? definition.layout : [];
    contract.template.globalSettings = definition.globalSettings || {};
    jobs.push({
      clinicId, originalJobId: input.originalJobId || null, targetId: target.id, printerId: printer.id,
      printAgentId: printer.printAgentId || null, templateVersionId: templateVersion.id,
      documentType: data.sourceDocumentType, documentNumber: contract.document.number, variant,
      contractVersion: contract.version, contractSnapshot: contract, attemptCount: 0
    });
  }
  return repository.createBatch({ ...data, clinicId, requestedById, variant, jobs });
};

const listBatches = async (clinicId, take, filters = {}) => {
  const sanitizedFilters = {};
  if (filters.status) sanitizedFilters.status = filters.status;
  if (filters.sourceDocumentType) sanitizedFilters.sourceDocumentType = filters.sourceDocumentType;
  if (filters.startDate || filters.endDate) {
    sanitizedFilters.createdAt = {};
    if (filters.startDate) sanitizedFilters.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) sanitizedFilters.createdAt.lte = new Date(filters.endDate);
  }
  return repository.listBatches(clinicId, Math.min(Number(take) || 50, 100), sanitizedFilters);
};

const activateTemplateVersion = async (versionId, clinicId) => {
  const version = await repository.activateTemplateVersion(Number(versionId), clinicId);
  if (!version) throw new AppError('TemplateVersion no encontrada o no autorizada', 404, 'PRINT_TEMPLATE_VERSION_NOT_FOUND');
  return version;
};

const deleteDraftTemplateVersion = async (versionId, clinicId) => {
  const id = Number(versionId);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('versionId no válido', 400, 'VALIDATION_ERROR');
  const version = await repository.findTemplateVersion(id, clinicId);
  if (!version) throw new AppError('TemplateVersion no encontrada o no autorizada', 404, 'PRINT_TEMPLATE_VERSION_NOT_FOUND');
  if (version.status !== 'DRAFT') throw new AppError('Solo se pueden eliminar versiones DRAFT', 409, 'PRINT_TEMPLATE_VERSION_NOT_DRAFT');
  try {
    const result = await repository.deleteDraftTemplateVersion(id, clinicId);
    if (!result.count) throw new AppError('La versión ya no es un borrador disponible', 409, 'PRINT_TEMPLATE_VERSION_NOT_DRAFT');
  } catch (error) {
    if (error.code === 'P2003') throw new AppError('No se puede eliminar una versión vinculada a trabajos de impresión', 409, 'PRINT_TEMPLATE_VERSION_IN_USE');
    throw error;
  }
  return { id, status: 'DELETED' };
};

const RESOURCE_MODELS = Object.freeze({
  locations: 'printLocation', agents: 'printAgent', profiles: 'printerProfile',
  printers: 'printer', targets: 'printTarget', templates: 'printTemplate', assets: 'printAsset'
});

const deactivateResource = async (resource, id, clinicId) => {
  const model = RESOURCE_MODELS[resource];
  if (!model) throw new AppError('Recurso de impresi��n no soportado', 400, 'PRINT_RESOURCE_INVALID');
  const result = await repository.deactivateResource(model, Number(id), clinicId);
  if (!result.count) throw new AppError('Recurso no encontrado o ya inactivo', 404, 'PRINT_RESOURCE_NOT_FOUND');
  return { id: Number(id), resource, isActive: false };
};

const UPDATE_FIELDS = Object.freeze({
  locations: { model: 'printLocation', fields: ['name', 'code'] },
  agents: { model: 'printAgent', fields: ['name', 'endpoint', 'status'] },
  profiles: { model: 'printerProfile', fields: ['name', 'paperTypes', 'capabilities'] },
  printers: { model: 'printer', fields: ['name', 'orientation'] },
  targets: { model: 'printTarget', fields: ['name'] },
  templates: { model: 'printTemplate', fields: ['name', 'documentType'] },
  assets: { model: 'printAsset', fields: ['name', 'storageKey', 'mimeType', 'width', 'height'] }
});

const updateResource = async (resource, id, data, clinicId) => {
  const definition = UPDATE_FIELDS[resource];
  if (!definition) throw new AppError('Recurso de impresi��n no soportado', 400, 'PRINT_RESOURCE_INVALID');
  const update = Object.fromEntries(Object.entries(data || {}).filter(([key, value]) => definition.fields.includes(key) && value !== undefined));
  if (!Object.keys(update).length) throw new AppError('No hay campos editables para actualizar', 400, 'PRINT_UPDATE_EMPTY');
  if ('name' in update) requireName(update.name, 'name');
  const result = await repository.updateResource(definition.model, Number(id), clinicId, update);
  if (!result.count) throw new AppError('Recurso no encontrado o inactivo', 404, 'PRINT_RESOURCE_NOT_FOUND');
  return { id: Number(id), resource, updated: Object.keys(update) };
};

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
  if (nextStatus === 'FAILED') data.lastError = String(details.error || 'Error de impresi��n').slice(0, 10000);
  if (nextStatus === 'RETRYING') { data.attemptCount = { increment: 1 }; data.lastError = null; }
  await repository.updateJob(jobId, clinicId, data);
  return recalculateBatch(job.batchId, clinicId);
};

const sendJobToAgent = async (jobId, clinicId) => {
  const job = await repository.findJob(jobId, clinicId);
  if (!job) throw new AppError('PrintJob no encontrado', 404, 'PRINT_JOB_NOT_FOUND');
  if (job.status !== 'PENDING' && job.status !== 'RETRYING') {
    throw new AppError(`El job ${jobId} no está en estado apto para envío (${job.status})`, 400, 'PRINT_INVALID_STATUS');
  }

  const printer = await repository.findPrinter(job.printerId, clinicId);
  if (!printer || !printer.printAgentId) throw new AppError('Impresora sin agente configurado', 409, 'PRINT_AGENT_MISSING');

  const agent = await repository.findAgent(printer.printAgentId, clinicId);
  if (!agent || agent.status !== 'ONLINE' || !agent.endpoint) {
    throw new AppError('El agente de impresión está offline o no tiene endpoint válido', 409, 'PRINT_AGENT_OFFLINE');
  }

  try {
    const response = await axios.post(`${agent.endpoint}/api/print/document`, job.contractSnapshot, {
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': agent.apiKey 
      },
      timeout: 10000
    });

    if (response.status === 200 || response.status === 202) {
      return await markJobSent(jobId, clinicId);
    } else {
      throw new Error(`Agent responded with status ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido al conectar con Agent';
    await markJobFailed(jobId, clinicId, { error: errorMessage });
    throw new AppError(`Error enviando al agente: ${errorMessage}`, 502, 'PRINT_AGENT_ERROR');
  }
};

const markJobSent = (jobId, clinicId) => transitionJob(jobId, clinicId, 'SENT');
const markJobPrinted = (jobId, clinicId) => transitionJob(jobId, clinicId, 'PRINTED');
const markJobFailed = (jobId, clinicId, details) => transitionJob(jobId, clinicId, 'FAILED', details);
const retryJob = async (jobId, clinicId) => {
  // 1. Cambiar estado a RETRYING (actualiza attemptCount y limpia error)
  await transitionJob(jobId, clinicId, 'RETRYING');
  
  // 2. Intentar el envío real al agente inmediatamente
  try {
    return await sendJobToAgent(jobId, clinicId);
  } catch (error) {
    // El error ya es manejado por sendJobToAgent que llama a markJobFailed
    throw error;
  }
};
const cancelJob = (jobId, clinicId) => transitionJob(jobId, clinicId, 'CANCELLED');

module.exports = {
  createLocation, createAgent, createProfile, createPrinter, createTarget,
  createTemplate, deleteTemplate, createTemplateVersion, activateTemplateVersion, deleteDraftTemplateVersion, deactivateResource, updateResource, createAsset, createBatch, listBatches,
  buildContract, recalculateBatch, markJobSent, markJobPrinted, markJobFailed, retryJob, cancelJob, sendJobToAgent,
  listRules, createRule, updateRule, deleteRule, findRulesByEvent,
  listLocations: repository.listLocations, listAgents: repository.listAgents, listProfiles: repository.listProfiles,
  listPrinters: repository.listPrinters, listTargets: repository.listTargets, listTemplates: repository.listTemplates,
  listAssets: repository.listAssets
};
