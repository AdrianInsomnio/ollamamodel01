const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.product.create({
    data: {
      ...data,
      organizationId
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.product.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.product.findFirst({
    where: { id, organizationId }
  });
};

const findByIds = async (ids, organizationId) => {
  return await prisma.product.findMany({
    where: {
      id: { in: ids },
      organizationId
    }
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.product.update({
    where: { id },
    data
  });
};

const remove = async (id, organizationId) => {
  return await prisma.product.delete({
    where: { id }
  });
};

const updateStock = async (id, quantityChange, organizationId) => {
  return await prisma.product.update({
    where: { id },
    data: {
      stock: {
        increment: quantityChange
      }
    }
  });
};

const getLowStockProducts = async (organizationId) => {
  return await prisma.product.findMany({
    where: {
      organizationId,
      stock: {
        lte: prisma.product.fields.minStock
      },
      isActive: true
    },
    orderBy: { stock: 'asc' }
  });
};

const getStockMovements = async (productId, organizationId, limit = 50) => {
  return await prisma.stockMovement.findMany({
    where: {
      productId,
      product: { organizationId }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
};

const createStockMovement = async (data) => {
  return await prisma.stockMovement.create({
    data
  });
};

const getProductsByCategory = async (category, organizationId) => {
  return await prisma.product.findMany({
    where: {
      category,
      organizationId,
      isActive: true
    },
    orderBy: { name: 'asc' }
  });
};

module.exports = {
  create,
  findAll,
  findById,
  findByIds,
  update,
  remove,
  updateStock,
  getLowStockProducts,
  getStockMovements,
  createStockMovement,
  getProductsByCategory
};
