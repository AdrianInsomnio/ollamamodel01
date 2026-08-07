const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
  const { items, ...saleData } = data;
  return await prisma.sale.create({
    data: {
      ...saleData,
      clinicId,
      items: {
        create: items.map(item => ({
          itemType: item.itemType,
          itemId: item.itemId,
          nameSnapshot: item.nameSnapshot,
          priceSnapshot: item.priceSnapshot,
          quantity: item.quantity,
          subtotal: item.subtotal
        }))
      }
    },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } },
      items: true
    }
  });
};

const createWithStockMovements = async (saleData, items, stockMovements, clinicId) => {
  return await prisma.$transaction(async (tx) => {
    // Crear la venta
    const sale = await tx.sale.create({
      data: {
        ...saleData,
        clinicId,
        items: {
          create: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            nameSnapshot: item.nameSnapshot,
            priceSnapshot: item.priceSnapshot,
            quantity: item.quantity,
            subtotal: item.subtotal
          }))
        }
      },
      include: {
        client: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        items: true
      }
    });

    // Registrar movimientos de stock
    for (const movement of stockMovements) {
      await tx.stockMovement.create({
        data: {
          ...movement,
          referenceType: 'sale',
          referenceId: sale.id
        }
      });

      // Actualizar stock del producto
      await tx.product.update({
        where: { id: movement.productId },
        data: {
          stock: {
            decrement: Math.abs(movement.quantity) // quantity es negativo para salidas
          }
        }
      });
    }

    return sale;
  });
};

const findAll = async (clinicId) => {
  return await prisma.sale.findMany({
    where: { clinicId },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } },
      items: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, clinicId) => {
  return await prisma.sale.findFirst({
    where: { id, clinicId },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } },
      consultation: true,
      items: true
    }
  });
};

const getSalesByClient = async (clientId, clinicId) => {
  return await prisma.sale.findMany({
    where: { clientId, clinicId },
    include: {
      items: true,
      pet: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const getTotalSalesByPeriod = async (startDate, endDate, clinicId) => {
  const result = await prisma.sale.aggregate({
    where: {
      clinicId,
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'completed'
    },
    _sum: {
      total: true,
      tax: true
    },
    _count: true
  });

  return {
    totalSales: result._count,
    totalAmount: result._sum.total || 0,
    totalTax: result._sum.tax || 0
  };
};

module.exports = {
  create,
  createWithStockMovements,
  findAll,
  findById,
  getSalesByClient,
  getTotalSalesByPeriod
};
