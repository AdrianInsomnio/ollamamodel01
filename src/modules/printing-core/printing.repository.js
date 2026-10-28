const { prisma } = require('../../lib/prisma');

const listLocations = (clinicId) => prisma.printLocation.findMany({ where: { clinicId }, orderBy: { name: 'asc' } });
const createLocation = (data, clinicId) => prisma.printLocation.create({ data: { ...data, clinicId } });
const findLocation = (id, clinicId) => prisma.printLocation.findFirst({ where: { id, clinicId, isActive: true } });

const ruleInclude = {
  outputs: {
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    include: { target: { include: { location: true, printer: { include: { printAgent: true, profile: true } } } } }
  }
};
const listRules = (clinicId) => prisma.printRule.findMany({ where: { clinicId }, include: ruleInclude, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] });
const createRule = (data, clinicId) => prisma.printRule.create({
  data: {
    clinicId, name: data.name, event: data.event, isActive: data.isActive,
    priority: data.priority,
    outputs: { create: data.outputs.map(({ name, targetId, templateKey, priority, copies, isActive }) => ({ name, targetId, templateKey, priority, copies, isActive })) }
  },
  include: ruleInclude
});
const updateRule = (id, data, clinicId) => prisma.$transaction(async (tx) => {
  const existing = await tx.printRule.findFirst({ where: { id, clinicId }, include: { outputs: { orderBy: [{ priority: 'asc' }, { id: 'asc' }] } } });
  if (!existing) return { count: 0, rule: null };

  const parentUpdate = Object.fromEntries(['name', 'event', 'isActive', 'priority'].filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
  if (data.outputs) {
    await tx.printRuleOutput.deleteMany({ where: { ruleId: id } });
    await tx.printRuleOutput.createMany({ data: data.outputs.map((output) => ({
      ruleId: id, name: output.name, targetId: output.targetId, templateKey: output.templateKey,
      priority: output.priority, copies: output.copies, isActive: output.isActive
    })) });
  } else if (data.targetId !== undefined || data.templateKey !== undefined || data.outputName !== undefined || data.copies !== undefined) {
    const first = existing.outputs[0];
    const outputUpdate = Object.fromEntries(
      [['targetId', data.targetId], ['templateKey', data.templateKey], ['name', data.outputName], ['priority', data.priority], ['copies', data.copies], ['isActive', data.outputIsActive]]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key === 'outputName' ? 'name' : key === 'outputIsActive' ? 'isActive' : key, value])
    );
    if (first) await tx.printRuleOutput.update({ where: { id: first.id }, data: outputUpdate });
    else if (data.targetId && data.templateKey) await tx.printRuleOutput.create({ data: {
      ruleId: id, name: data.outputName || `Salida ${id}`, targetId: data.targetId, templateKey: data.templateKey,
      priority: data.priority ?? 0, copies: data.copies ?? 1, isActive: data.outputIsActive ?? true
    } });
  }
  if (Object.keys(parentUpdate).length) await tx.printRule.update({ where: { id }, data: parentUpdate });
  const rule = await tx.printRule.findFirst({ where: { id, clinicId }, include: ruleInclude });
  return { count: 1, rule };
});
const deleteRule = (id, clinicId) => prisma.printRule.deleteMany({ where: { id, clinicId } });
const findRulesByEvent = (clinicId, event) => prisma.printRule.findMany({ where: { clinicId, event, isActive: true }, include: ruleInclude, orderBy: [{ priority: 'asc' }, { id: 'asc' }] });

const listAgents = (clinicId) => prisma.printAgent.findMany({ where: { clinicId }, include: { location: true }, orderBy: { name: 'asc' } });
const createAgent = (data, clinicId) => prisma.printAgent.create({ data: { ...data, clinicId } });
const findAgent = (id, clinicId) => prisma.printAgent.findFirst({ where: { id, clinicId, isActive: true } });

const listProfiles = (clinicId) => prisma.printerProfile.findMany({ where: { clinicId }, orderBy: { name: 'asc' } });
const createProfile = (data, clinicId) => prisma.printerProfile.create({ data: { ...data, clinicId } });
const findProfile = (id, clinicId) => prisma.printerProfile.findFirst({ where: { id, clinicId, isActive: true } });

const listPrinters = (clinicId) => prisma.printer.findMany({
  where: { clinicId },
  include: { location: true, printAgent: true, profile: true },
  orderBy: { name: 'asc' }
});
const createPrinter = (data, clinicId) => prisma.printer.create({ data: { ...data, clinicId } });

const listTargets = (clinicId) => prisma.printTarget.findMany({
  where: { clinicId },
  include: { location: true, printer: { include: { printAgent: true, profile: true } } },
  orderBy: { code: 'asc' }
});
const createTarget = (data, clinicId) => prisma.printTarget.create({ data: { ...data, clinicId } });

const listTemplates = (clinicId) => prisma.printTemplate.findMany({
  where: { clinicId },
  include: { versions: { orderBy: { version: 'desc' } } },
  orderBy: { name: 'asc' }
});
const listTemplateSummaries = (clinicId) => prisma.printTemplate.findMany({
  where: { clinicId },
  select: {
    id: true, templateKey: true, name: true, documentType: true, isActive: true,
    versions: {
      orderBy: { version: 'desc' },
      select: { id: true, templateId: true, version: true, status: true, paperType: true, paperSize: true, orientation: true, createdAt: true }
    }
  },
  orderBy: { name: 'asc' }
});
const findTemplateDetails = (id, clinicId) => prisma.printTemplate.findFirst({
  where: { id, clinicId },
  include: { versions: { orderBy: { version: 'desc' } } }
});
const createTemplate = (data, clinicId) => prisma.printTemplate.create({ data: { ...data, clinicId } });
const deleteTemplate = async (id, clinicId) => prisma.$transaction(async (tx) => {
  const template = await tx.printTemplate.findFirst({ where: { id, clinicId }, select: { id: true, templateKey: true } });
  if (!template) return null;
  const versions = await tx.printTemplateVersion.findMany({ where: { templateId: id }, select: { id: true } });
  const versionIds = versions.map(({ id: versionId }) => versionId);
  const linkedJobs = versionIds.length
    ? await tx.printJob.count({ where: { templateVersionId: { in: versionIds } } })
    : 0;
  if (linkedJobs) return { linkedJobs };
  await tx.printRuleOutput.deleteMany({ where: { templateKey: template.templateKey, rule: { clinicId } } });
  const emptyRules = await tx.printRule.findMany({ where: { clinicId, outputs: { none: {} } }, select: { id: true } });
  if (emptyRules.length) await tx.printRule.deleteMany({ where: { clinicId, id: { in: emptyRules.map((rule) => rule.id) } } });
  await tx.printTemplateVersion.deleteMany({ where: { templateId: id } });
  await tx.printTemplate.delete({ where: { id } });
  return { id, deleted: true };
});
const createTemplateVersion = (data) => prisma.printTemplateVersion.create({ data });
const deleteDraftTemplateVersion = (id, clinicId) => prisma.printTemplateVersion.deleteMany({
  where: { id, status: 'DRAFT', template: { clinicId, isActive: true } }
});
const activateTemplateVersion = async (id, clinicId) => {
  const version = await findTemplateVersion(id, clinicId);
  if (!version) return null;
  return prisma.$transaction(async (tx) => {
    await tx.printTemplateVersion.updateMany({ where: { templateId: version.templateId }, data: { status: 'ARCHIVED' } });
    return tx.printTemplateVersion.update({ where: { id }, data: { status: 'ACTIVE' } });
  });
};

const listAssets = (clinicId) => prisma.printAsset.findMany({ where: { clinicId }, orderBy: { name: 'asc' } });
const createAsset = (data, clinicId) => prisma.printAsset.create({ data: { ...data, clinicId } });

const findClinic = (clinicId) => prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true, name: true } });
const findTarget = (id, clinicId) => prisma.printTarget.findFirst({
  where: { id, clinicId, isActive: true },
  include: { location: true, printer: { include: { printAgent: true, profile: true } } }
});
const findTargetForRule = (id, clinicId) => prisma.printTarget.findFirst({
  where: { id, clinicId },
  include: { location: true, printer: { include: { printAgent: true, profile: true } } }
});
const findPrinter = (id, clinicId) => prisma.printer.findFirst({ where: { id, clinicId, isActive: true }, include: { printAgent: true, profile: true } });
const findTemplateVersion = (id, clinicId) => prisma.printTemplateVersion.findFirst({
  where: { id, template: { clinicId, isActive: true } },
  include: { template: true }
});
const findTemplate = (id, clinicId) => prisma.printTemplate.findFirst({ where: { id, clinicId, isActive: true } });
const findTemplateByKey = (templateKey, clinicId) => prisma.printTemplate.findFirst({ where: { clinicId, templateKey, isActive: true } });
const findTemplateByKeyForRule = (templateKey, clinicId) => prisma.printTemplate.findFirst({ where: { clinicId, templateKey } });
const findActiveTemplateVersionByKey = (templateKey, clinicId) => prisma.printTemplateVersion.findFirst({
  where: { status: 'ACTIVE', template: { clinicId, templateKey, isActive: true } },
  include: { template: true }
});

const createBatch = (data) => prisma.printBatch.create({
  data: {
    clinicId: data.clinicId,
    requestedById: data.requestedById,
    originalBatchId: data.originalBatchId,
    sourceDocumentType: data.sourceDocumentType,
    sourceDocumentId: String(data.sourceDocumentId),
    variant: data.variant,
    reason: data.reason,
    status: 'PENDING',
    jobs: { create: data.jobs }
  },
  include: { jobs: true }
});

const listBatches = (clinicId, take = 50, skip = 0, filters = {}) => prisma.printBatch.findMany({
  where: { 
    clinicId, 
    ...(filters.status ? { status: filters.status } : {}), 
    ...(filters.sourceDocumentType ? { sourceDocumentType: filters.sourceDocumentType } : {}),
    ...(filters.createdAt ? { createdAt: filters.createdAt } : {})
  },
  take,
  skip,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  select: {
    id: true, sourceDocumentType: true, status: true, createdAt: true,
    jobs: { select: { id: true, status: true, targetId: true, lastError: true } }
  }
});

const findBatch = (id, clinicId) => prisma.printBatch.findFirst({ where: { id, clinicId }, include: { jobs: true } });
const findJob = (id, clinicId) => prisma.printJob.findFirst({ where: { id, clinicId }, include: { batch: true } });
const updateJob = (id, clinicId, data) => prisma.printJob.updateMany({ where: { id, clinicId }, data });
const updateBatchStatus = (id, clinicId, status) => prisma.printBatch.updateMany({ where: { id, clinicId }, data: { status } });
const deactivateResource = (model, id, clinicId) => prisma[model].updateMany({ where: { id, clinicId, isActive: true }, data: { isActive: false } });
const updateResource = (model, id, clinicId, data) => prisma[model].updateMany({ where: { id, clinicId, isActive: true }, data });

module.exports = {
    listLocations, createLocation, findLocation,
    listRules, createRule, updateRule, deleteRule, findRulesByEvent,
  listAgents, createAgent, findAgent,
  listProfiles, createProfile, findProfile,
  listPrinters, createPrinter,
  listTargets, createTarget,
    listTemplates, listTemplateSummaries, findTemplateDetails, createTemplate, deleteTemplate, createTemplateVersion, deleteDraftTemplateVersion,
  listAssets, createAsset,
  findClinic, findTarget, findTargetForRule, findPrinter, findTemplate, findTemplateByKey, findTemplateByKeyForRule, findTemplateVersion, findActiveTemplateVersionByKey,
  createBatch, activateTemplateVersion, listBatches, findBatch, findJob, updateJob, updateBatchStatus, deactivateResource, updateResource
};
