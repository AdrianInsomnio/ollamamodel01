const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => prisma.equipment.create({
  data: { name: data.name, description: data.description ?? null, clinicId, isActive: true },
});

const findAll = async (clinicId) => prisma.equipment.findMany({ where: { clinicId }, orderBy: { name: 'asc' } });

const findById = async (id, clinicId) => prisma.equipment.findFirst({ where: { id, clinicId } });

const findByName = async (name, clinicId, excludeId = null) => prisma.equipment.findFirst({
  where: { clinicId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
  select: { id: true },
});

const update = async (id, data) => prisma.equipment.update({ where: { id }, data });

module.exports = { create, findAll, findById, findByName, update };
