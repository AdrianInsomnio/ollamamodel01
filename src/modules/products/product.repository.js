const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
  return await prisma.products.create({
    data: {
      ...data,
      clinicId
    },
    include: {
      category: true
    }
  });
};

const findAll = async (clinicId, options = {}) => {
  const { includeDiscontinued = false, categoryId } = options;

  const where = { clinicId };

  if (!includeDiscontinued) {
    where.discontinuedAt = null;
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }

  return await prisma.products.findMany({
    where,
    include: {
      category: true
    },
    orderBy: { name: 'asc' }
  });
};

const findById = async (id, clinicId) => {
  return await prisma.products.findFirst({
    where: { id, clinicId },
    include: {
      category: true,
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
};

const findByIds = async (ids, clinicId) => {
  return await prisma.products.findMany({
    where: {
      id: { in: ids },
      clinicId
    }
  });
};

const update = async (id, clinicId, data) => {
  return await prisma.products.update({
    where: { id, clinicId },
    data,
    include: {
      category: true
    }
  });
};

const remove = async (id, clinicId) => {
  return await prisma.products.delete({
    where: { id, clinicId }
  });
};

const updateStock = async (id, quantityChange, clinicId) => {
  return await prisma.products.update({
    where: { id, clinicId },
    data: {
      stock: {
        increment: quantityChange
      }
    }
  });
};

const getLowStockProducts = async (clinicId) => {
  return await prisma.products.findMany({
    where: {
      clinicId,
      stock: {
        lte: prisma.products.fields.minStock
      },
      isActive: true
    },
    orderBy: { stock: 'asc' }
  });
};

const getStockMovements = async (productId, clinicId, limit = 50) => {
  return await prisma.stockMovement.findMany({
    where: {
      productId,
      product: { clinicId }
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

const getProductsByCategory = async (category, clinicId) => {
  return await prisma.products.findMany({
    where: {
      category,
      clinicId,
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


