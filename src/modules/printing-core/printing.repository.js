const { prisma } = require('../../lib/prisma');

const listLocations = (clinicId) => prisma.printLocation.findMany({ where: { clinicId }, orderBy: { name: 'asc' } });
const createLocation = (data, clinicId) => prisma.printLocation.create({ data: { ...data, clinicId } });
const findLocation = (id, clinicId) => prisma.printLocation.findFirst({ where: { id, clinicId, isActive: true } });

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
const createTemplate = (data, clinicId) => prisma.printTemplate.create({ data: { ...data, clinicId } });
const createTemplateVersion = (data) => prisma.printTemplateVersion.create({ data });
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
  include: { printer: { include: { printAgent: true, profile: true } } }
});
const findPrinter = (id, clinicId) => prisma.printer.findFirst({ where: { id, clinicId, isActive: true }, include: { printAgent: true, profile: true } });
const findTemplateVersion = (id, clinicId) => prisma.printTemplateVersion.findFirst({
  where: { id, template: { clinicId, isActive: true } },
  include: { template: true }
});
const findTemplate = (id, clinicId) => prisma.printTemplate.findFirst({ where: { id, clinicId, isActive: true } });

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

const listBatches = (clinicId, take = 50, filters = {}) => prisma.printBatch.findMany({
  where: { clinicId, ...(filters.status ? { status: filters.status } : {}), ...(filters.sourceDocumentType ? { sourceDocumentType: filters.sourceDocumentType } : {}) },
  take,
  orderBy: { createdAt: 'desc' },
  include: { jobs: true }
});

const findBatch = (id, clinicId) => prisma.printBatch.findFirst({ where: { id, clinicId }, include: { jobs: true } });
const findJob = (id, clinicId) => prisma.printJob.findFirst({ where: { id, clinicId }, include: { batch: true } });
const updateJob = (id, clinicId, data) => prisma.printJob.updateMany({ where: { id, clinicId }, data });
const updateBatchStatus = (id, clinicId, status) => prisma.printBatch.updateMany({ where: { id, clinicId }, data: { status } });
const deactivateResource = (model, id, clinicId) => prisma[model].updateMany({ where: { id, clinicId, isActive: true }, data: { isActive: false } });

module.exports = {
  listLocations, createLocation, findLocation,
  listAgents, createAgent, findAgent,
  listProfiles, createProfile, findProfile,
  listPrinters, createPrinter,
  listTargets, createTarget,
  listTemplates, createTemplate,
  listAssets, createAsset,
  findClinic, findTarget, findPrinter, findTemplate, findTemplateVersion,
  createBatch, activateTemplateVersion, listBatches, findBatch, findJob, updateJob, updateBatchStatus, deactivateResource
};
