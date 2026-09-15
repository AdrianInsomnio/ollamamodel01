const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId) => {
  return await prisma.product.create({
    data: {
      ...data,
      clinicId
    },
    include: {
      category: true,
      subcategory: true,
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

  return await prisma.product.findMany({
    where,
    include: {
      category: true,
      subcategory: true,
    },
    orderBy: { name: 'asc' }
  });
};

const findById = async (id, clinicId) => {
  return await prisma.product.findFirst({
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
  return await prisma.product.findMany({
    where: {
      id: { in: ids },
      clinicId
    }
  });
};

const findCategory = async (categoryId, clinicId) => prisma.productCategory.findFirst({
  where: { id: Number(categoryId), clinicId, isActive: true },
  select: { id: true },
});

const findSubcategory = async (subcategoryId, categoryId, clinicId) => prisma.productSubcategory.findFirst({
  where: { id: Number(subcategoryId), categoryId: Number(categoryId), clinicId, isActive: true, category: { isActive: true } },
  select: { id: true },
});

const update = async (id, clinicId, data) => {
  return await prisma.product.update({
    where: { id, clinicId },
    data,
    include: {
      category: true,
      subcategory: true,
    }
  });
};

const remove = async (id, clinicId) => {
  return await prisma.product.delete({
    where: { id, clinicId }
  });
};

const updateStock = async (id, quantityChange, clinicId) => {
  return await prisma.product.update({
    where: { id, clinicId },
    data: {
      stock: {
        increment: quantityChange
      }
    }
  });
};

const adjustStockAtomic = async ({ id, quantity, reason, clinicId, notes = '' }) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: {
        id,
        clinicId,
        ...(quantity < 0 ? { stock: { gte: Math.abs(quantity) } } : {}),
      },
      data: { stock: { increment: quantity } },
    });

    if (updated.count !== 1) {
      throw new AppError('El producto no existe en la clÃ­nica o el stock disponible es insuficiente', 409, 'INSUFFICIENT_STOCK');
    }

    const product = await tx.product.findFirst({
      where: { id, clinicId },
      select: { stock: true },
    });

    await tx.stockMovement.create({
      data: {
        productId: id,
        clinicId,
        type: quantity > 0 ? 'in' : 'out',
        quantity,
        reason,
        notes,
      },
    });

    return { message: 'Stock ajustado exitosamente', newStock: product.stock };
  });
};

const getLowStockProducts = async (clinicId) => {
  return await prisma.product.findMany({
    where: {
      clinicId,
      stock: {
        lte: prisma.product.fields.minStock
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
  return await prisma.product.findMany({
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
  findCategory,
  findSubcategory,
  update,
  remove,
  updateStock,
  adjustStockAtomic,
  getLowStockProducts,
  getStockMovements,
  createStockMovement,
  getProductsByCategory
};



