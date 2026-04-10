const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  const { items, ...saleData } = data;
  return await prisma.sale.create({
    data: {
      ...saleData,
      organizationId,
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

const findAll = async (organizationId) => {
  return await prisma.sale.findMany({
    where: { organizationId },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } },
      items: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.sale.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, name: true } },
      pet: { select: { id: true, name: true } },
      consultation: true,
      items: true
    }
  });
};

module.exports = { create, findAll, findById };
