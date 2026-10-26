const { prisma } = require('../../lib/prisma');

const findAll = (clinicId) => prisma.productCategory.findMany({
  where: { clinicId },
  include: { _count: { select: { products: true } } },
  orderBy: { name: 'asc' },
});

const findById = (id, clinicId) => prisma.productCategory.findFirst({ where: { id, clinicId } });

const findActiveByNameAndType = (name, type, clinicId) => prisma.productCategory.findFirst({
  where: { name: name.trim(), type, clinicId, isActive: true },
});

const create = (data, clinicId) => prisma.productCategory.create({
  data: { name: data.name, type: data.type ?? 'PRODUCTO', description: data.description ?? null, clinicId },
  include: { _count: { select: { products: true } } },
});

const update = (id, clinicId, data) => prisma.productCategory.update({
  where: { id },
  data,
  include: { _count: { select: { products: true } } },
});

const findSubcategories = (categoryId, clinicId) => prisma.productSubcategory.findMany({
  where: { categoryId, clinicId },
  orderBy: { name: 'asc' },
});

const findSubcategory = (id, categoryId, clinicId) => prisma.productSubcategory.findFirst({
  where: { id, categoryId, clinicId },
});

const createSubcategory = (data, categoryId, clinicId) => prisma.productSubcategory.create({
  data: { ...data, categoryId, clinicId },
});

const updateSubcategory = (id, categoryId, clinicId, data) => prisma.productSubcategory.update({
  where: { id },
  data,
});

module.exports = { findAll, findById, findActiveByNameAndType, create, update, findSubcategories, findSubcategory, createSubcategory, updateSubcategory };
