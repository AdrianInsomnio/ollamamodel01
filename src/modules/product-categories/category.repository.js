const { prisma } = require('../../lib/prisma');

const findAll = (clinicId) => prisma.productCategory.findMany({
  where: { clinicId },
  include: { _count: { select: { products: true } } },
  orderBy: { name: 'asc' },
});

const findById = (id, clinicId) => prisma.productCategory.findFirst({ where: { id, clinicId } });

const create = (data, clinicId) => prisma.productCategory.create({
  data: { name: data.name, description: data.description ?? null, clinicId },
  include: { _count: { select: { products: true } } },
});

const update = (id, clinicId, data) => prisma.productCategory.update({
  where: { id },
  data,
  include: { _count: { select: { products: true } } },
});

module.exports = { findAll, findById, create, update };
