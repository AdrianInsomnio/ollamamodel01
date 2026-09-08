const { prisma } = require('../../lib/prisma');

const equipmentInclude = { include: { equipment: true } };

const create = async (data, clinicId) => prisma.consultorio.create({
  data: {
    name: data.name,
    description: data.description ?? null,
    size: data.size ?? null,
    clinicId,
    status: 'ACTIVE',
  },
  include: { equipment: equipmentInclude },
});

const findAll = async (clinicId) => prisma.consultorio.findMany({
  where: { clinicId },
  include: { equipment: equipmentInclude },
  orderBy: { name: 'asc' },
});

const findById = async (id, clinicId) => prisma.consultorio.findFirst({
  where: { id, clinicId },
  include: { equipment: equipmentInclude },
});

const findByName = async (name, clinicId, excludeId = null) => prisma.consultorio.findFirst({
  where: {
    clinicId,
    name,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  },
  select: { id: true },
});

const update = async (id, clinicId, data) => prisma.consultorio.update({
  where: { id },
  data,
  include: { equipment: equipmentInclude },
});

const updateStatus = async (id, clinicId, status) => prisma.consultorio.update({
  where: { id },
  data: { status },
  include: { equipment: equipmentInclude },
});

const findAvailable = async (clinicId, startAt, endAt) => prisma.consultorio.findMany({
  where: {
    clinicId,
    status: 'ACTIVE',
    consultations: {
      none: {
        status: { not: 'CANCELED' },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    },
  },
  include: { equipment: equipmentInclude },
  orderBy: { name: 'asc' },
});

const createEquipmentAssociation = async (consultorioId, equipmentId, data) => prisma.consultorioEquipment.create({
  data: {
    consultorioId,
    equipmentId,
    quantity: data.quantity,
    status: data.status,
    notes: data.notes ?? null,
  },
  include: { equipment: true },
});

const findEquipmentAssociation = async (consultorioId, equipmentId, clinicId) => prisma.consultorioEquipment.findFirst({
  where: {
    consultorioId,
    equipmentId,
    consultorio: { clinicId },
    equipment: { clinicId },
  },
  include: { equipment: true },
});

const updateEquipmentAssociation = async (id, data) => prisma.consultorioEquipment.update({
  where: { id },
  data,
  include: { equipment: true },
});

const deleteEquipmentAssociation = async (id) => prisma.consultorioEquipment.delete({ where: { id } });

module.exports = {
  create,
  findAll,
  findById,
  findByName,
  update,
  updateStatus,
  findAvailable,
  createEquipmentAssociation,
  findEquipmentAssociation,
  updateEquipmentAssociation,
  deleteEquipmentAssociation,
};
