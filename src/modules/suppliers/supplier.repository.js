const { prisma } = require('../../lib/prisma');

const findAll = (clinicId, activeOnly = false) => prisma.supplier.findMany({
  where: { clinicId, ...(activeOnly ? { isActive: true } : {}) },
  include: { _count: { select: { products: true } } },
  orderBy: { name: 'asc' },
});

const findById = (id, clinicId) => prisma.supplier.findFirst({
  where: { id, clinicId },
  include: { _count: { select: { products: true } } },
});

const findDuplicate = ({ clinicId, name, rut, exceptId }) => prisma.supplier.findFirst({
  where: {
    clinicId,
    ...(exceptId ? { id: { not: exceptId } } : {}),
    OR: [
      { name },
      ...(rut ? [{ rut }] : []),
    ],
  },
  select: { id: true },
});

const create = (data) => prisma.supplier.create({ data });

const update = (id, clinicId, data) => prisma.supplier.update({
  where: { id, clinicId },
  data,
});

module.exports = { findAll, findById, findDuplicate, create, update };
