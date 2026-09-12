const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../core/errors/AppError');
const { SALE_STATUS, LEGACY_SALE_STATUS, isDraftStatus, isWaitingStatus, isCancelledStatus, normalizeSaleStatus } = require('./sale.status');

const create = async (data, clinicId) => {
  const { items, ...saleData } = data;
  return await prisma.sale.create({
    data: {
      ...saleData,
      clinicId,
      saleItems: {
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
      saleItems: true
    }
  });
};

const createWithStockMovements = async (saleData, items, stockMovements, clinicId) => {
  return await prisma.$transaction(async (tx) => {
    const { payments = [], ...persistedSaleData } = saleData;

    if (persistedSaleData.cashShiftId != null) {
      await tx.$queryRaw`
        SELECT id
        FROM cash_shifts
        WHERE id = ${persistedSaleData.cashShiftId} AND clinicId = ${clinicId}
        FOR UPDATE
      `;

      const shift = await tx.cashShift.findFirst({
        where: {
          id: persistedSaleData.cashShiftId,
          clinicId,
          status: 'OPEN',
        },
        select: { id: true, userId: true },
      });

      if (!shift) {
        throw new AppError('El turno de caja no existe, no pertenece a la clínica o está cerrado', 400, 'INVALID_CASH_SHIFT');
      }

      if (persistedSaleData.userId != null && shift.userId !== persistedSaleData.userId) {
        throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');
      }
    }

    // Crear la venta
    const sale = await tx.sale.create({
      data: {
        ...persistedSaleData,
        clinicId,
        saleItems: {
          create: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            nameSnapshot: item.nameSnapshot,
            priceSnapshot: item.priceSnapshot,
            quantity: item.quantity,
            subtotal: item.subtotal
          }))
        },
        payments: payments.length
          ? {
            create: payments.map((payment) => ({
              id: require('node:crypto').randomUUID(),
              amount: payment.amount,
              method: payment.method,
              reference: payment.reference,
              notes: payment.notes,
              cashShiftId: persistedSaleData.cashShiftId,
            })),
          }
          : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        saleItems: true,
        payments: true,
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
      saleItems: true
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
      saleItems: true,
      payments: true,
      cashShift: { include: { cashRegister: true } },
    }
  });
};

const createWaitingSaleAtomic = async ({ saleData, items, clinicId, userId, cashShiftId }) => {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM cash_shifts
      WHERE id = ${cashShiftId} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    const shift = await tx.cashShift.findFirst({
      where: { id: cashShiftId, clinicId, userId, status: 'OPEN' },
      include: { cashRegister: true },
    });
    if (!shift) throw new AppError('El turno de caja no existe, no pertenece a la clínica o está cerrado', 400, 'INVALID_CASH_SHIFT');

    const sale = await tx.sale.create({
      data: {
        ...saleData,
        clinicId,
        cashShiftId,
        userId,
        status: SALE_STATUS.WAITING,
        paymentMethod: null,
        saleItems: { create: items },
      },
      include: {
        client: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        saleItems: true,
        payments: true,
        cashShift: { include: { cashRegister: true } },
      },
    });

    await tx.cashAuditEvent.create({
      data: {
        action: 'SALE_WAITING',
        clinicId,
        userId,
        cashRegisterId: shift.cashRegisterId,
        cashShiftId,
        saleId: sale.id,
        details: { status: SALE_STATUS.WAITING, total: sale.total },
      },
    });

    return sale;
  });
};

const findWaitingSales = async (cashShiftId, clinicId) => prisma.sale.findMany({
  where: { cashShiftId, clinicId, status: { in: [SALE_STATUS.WAITING, LEGACY_SALE_STATUS.WAITING] } },
  include: {
    client: { select: { id: true, name: true } },
    pet: { select: { id: true, name: true } },
    saleItems: true,
    user: { select: { id: true, username: true } },
  },
  orderBy: { createdAt: 'asc' },
});

const resumeWaitingSaleAtomic = async ({ id, clinicId, userId }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, clinicId, status: { in: [SALE_STATUS.WAITING, LEGACY_SALE_STATUS.WAITING] } },
      include: { cashShift: { include: { cashRegister: true } } },
    });
    if (!sale) throw new AppError('Cuenta en espera no encontrada', 404, 'WAITING_ACCOUNT_NOT_FOUND');
    if (!sale.cashShift || sale.cashShift.status !== 'OPEN') throw new AppError('No se puede retomar una cuenta con turno cerrado', 400, 'CASH_SHIFT_CLOSED');
    if (sale.cashShift.userId !== userId) throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');

    await tx.$queryRaw`
      SELECT id
      FROM sales
      WHERE id = ${id} AND clinicId = ${clinicId} AND status IN ('WAITING', 'HELD')
      FOR UPDATE
    `;

    const updated = await tx.sale.updateMany({
      where: { id, clinicId, status: { in: [SALE_STATUS.WAITING, LEGACY_SALE_STATUS.WAITING] } },
      data: { status: SALE_STATUS.DRAFT, userId },
    });
    if (updated.count !== 1) throw new AppError('La cuenta en espera ya fue retomada', 409, 'WAITING_ACCOUNT_ALREADY_RESUMED');

    await tx.cashAuditEvent.create({
      data: {
        action: 'SALE_RESUMED',
        clinicId,
        userId,
        cashRegisterId: sale.cashShift.cashRegisterId,
        cashShiftId: sale.cashShiftId,
        saleId: id,
        details: { previousStatus: normalizeSaleStatus(sale.status), status: SALE_STATUS.DRAFT },
      },
    });

    return tx.sale.findFirst({
      where: { id, clinicId },
      include: { client: true, pet: true, saleItems: true, payments: true, cashShift: { include: { cashRegister: true } } },
    });
  });
};

const createTicketPrintAtomic = async ({ saleId, clinicId, userId, reason }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, clinicId },
      include: {
        client: { select: { id: true, name: true, documentId: true, phone: true } },
        pet: { select: { id: true, name: true, species: true, breed: true } },
        saleItems: true,
        payments: { orderBy: { createdAt: 'asc' } },
        cashShift: { include: { cashRegister: true } },
      },
    });

    if (!sale) throw new AppError('Venta no encontrada', 404);

    await tx.$queryRaw`
      SELECT id
      FROM sales
      WHERE id = ${saleId} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    const printCount = await tx.ticketPrint.count({ where: { saleId, clinicId } });
    const type = printCount === 0 ? 'ORIGINAL' : 'DUPLICATE';
    const print = await tx.ticketPrint.create({
      data: {
        saleId,
        userId,
        clinicId,
        cashShiftId: sale.cashShiftId,
        cashRegisterId: sale.cashShift?.cashRegisterId || null,
        type,
        reprintNumber: printCount,
        reason: reason || null,
      },
    });

    await tx.cashAuditEvent.create({
      data: {
        action: type === 'ORIGINAL' ? 'TICKET_PRINTED' : 'TICKET_REPRINTED',
        clinicId,
        userId,
        cashRegisterId: sale.cashShift?.cashRegisterId || null,
        cashShiftId: sale.cashShiftId,
        saleId,
        details: { printId: print.id, type, reprintNumber: print.reprintNumber, reason: reason || null },
      },
    });

    return { sale, print };
  });
};

const findTicketPrints = async (saleId, clinicId) => {
  const sale = await prisma.sale.findFirst({ where: { id: saleId, clinicId }, select: { id: true } });
  if (!sale) throw new AppError('Venta no encontrada', 404);
  return prisma.ticketPrint.findMany({
    where: { saleId, clinicId },
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
};

const cancelSaleAtomic = async ({ id, clinicId, userId, reason }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, clinicId },
      include: {
        saleItems: true,
        payments: true,
        cashShift: { include: { cashRegister: true } },
      },
    });

    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (isCancelledStatus(sale.status)) throw new AppError('La venta ya está cancelada', 400, 'SALE_ALREADY_CANCELLED');
    if (!sale.cashShift || sale.cashShift.status !== 'OPEN') {
      throw new AppError('No puede cancelarse este ticket porque el turno ya fue cerrado', 400, 'CASH_SHIFT_CLOSED');
    }
    if (userId != null && sale.cashShift.userId !== userId) {
      throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');
    }

    const pendingSale = isWaitingStatus(sale.status) || isDraftStatus(sale.status);

    await tx.$queryRaw`
      SELECT id
      FROM sales
      WHERE id = ${id} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    await tx.sale.update({ where: { id }, data: { status: SALE_STATUS.CANCELLED } });

    for (const item of sale.saleItems) {
      if (pendingSale) continue;
      if (item.itemType !== 'product') continue;
      await tx.product.update({ where: { id: item.itemId }, data: { stock: { increment: item.quantity } } });
      await tx.stockMovement.create({
        data: {
          productId: item.itemId,
          type: 'adjustment',
          quantity: item.quantity,
          reason: 'Cancelación de venta',
          referenceType: 'sale',
          referenceId: id,
          notes: reason || 'Reversión de venta cancelada',
        },
      });
    }

    for (const payment of sale.payments) {
      if (pendingSale) break;
      await tx.payment.create({
        data: {
          id: require('node:crypto').randomUUID(),
          saleId: id,
          cashShiftId: sale.cashShiftId,
          amount: -Number(payment.amount),
          method: payment.method,
          reference: `REVERSAL:${payment.id}`,
          notes: reason || 'Reversión por cancelación de venta',
        },
      });
    }

    await tx.cashAuditEvent.create({
      data: {
        action: 'SALE_CANCELLED',
        clinicId,
        userId,
        cashRegisterId: sale.cashShift.cashRegisterId,
        cashShiftId: sale.cashShiftId,
        saleId: id,
        details: { reason: reason || null, reversedPaymentIds: sale.payments.map((payment) => payment.id) },
      },
    });

    return tx.sale.findFirst({
      where: { id, clinicId },
      include: { saleItems: true, payments: true, cashShift: true },
    });
  });
};

const updateSaleAtomic = async ({ id, clinicId, userId, saleData, items, stockMovements, payments, reason }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, clinicId },
      include: {
        saleItems: true,
        payments: true,
        cashShift: { include: { cashRegister: true } },
      },
    });

    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (isCancelledStatus(sale.status)) throw new AppError('No puede modificarse una venta cancelada', 400, 'SALE_ALREADY_CANCELLED');
    if (!sale.cashShift || sale.cashShift.status !== 'OPEN') {
      throw new AppError('No puede modificarse este ticket porque el turno ya fue cerrado', 400, 'CASH_SHIFT_CLOSED');
    }
    if (userId != null && sale.cashShift.userId !== userId) {
      throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');
    }

    const pendingSale = isWaitingStatus(sale.status) || isDraftStatus(sale.status);

    await tx.$queryRaw`
      SELECT id
      FROM sales
      WHERE id = ${id} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    for (const item of sale.saleItems) {
      if (!pendingSale && item.itemType === 'product') {
        await tx.product.update({ where: { id: item.itemId }, data: { stock: { increment: item.quantity } } });
      }
    }
    for (const movement of stockMovements) {
      const updated = await tx.product.updateMany({
        where: { id: movement.productId, stock: { gte: Math.abs(movement.quantity) } },
        data: { stock: { decrement: Math.abs(movement.quantity) } },
      });
      if (updated.count !== 1) throw new AppError('Stock insuficiente para modificar la venta', 400, 'INSUFFICIENT_STOCK');
    }

    for (const payment of sale.payments) {
      if (pendingSale) break;
      await tx.payment.create({
        data: {
          id: require('node:crypto').randomUUID(),
          saleId: id,
          cashShiftId: sale.cashShiftId,
          amount: -Number(payment.amount),
          method: payment.method,
          reference: `REVISION:${payment.id}`,
          notes: reason || 'Reversión por modificación de venta',
        },
      });
    }

    for (const movement of stockMovements) {
      await tx.stockMovement.create({
        data: {
          ...movement,
          referenceType: 'sale',
          referenceId: id,
          reason: 'Modificación de venta',
        },
      });
    }

    await tx.saleItem.deleteMany({ where: { saleId: id } });
    const updatedSale = await tx.sale.update({
      where: { id },
      data: {
        ...saleData,
        saleItems: { create: items },
        payments: {
          create: payments.map((payment) => ({
            id: require('node:crypto').randomUUID(),
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            notes: payment.notes,
            cashShiftId: sale.cashShiftId,
          })),
        },
      },
      include: { saleItems: true, payments: true, cashShift: true },
    });

    await tx.cashAuditEvent.create({
      data: {
        action: 'SALE_MODIFIED',
        clinicId,
        userId,
        cashRegisterId: sale.cashShift.cashRegisterId,
        cashShiftId: sale.cashShiftId,
        saleId: id,
        details: { reason: reason || null, previousTotal: sale.total, newTotal: saleData.total },
      },
    });

    return updatedSale;
  });
};

const getSalesByClient = async (clientId, clinicId) => {
  return await prisma.sale.findMany({
    where: { clientId, clinicId },
    include: {
      saleItems: true,
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
      status: { in: [SALE_STATUS.CONFIRMED, LEGACY_SALE_STATUS.CONFIRMED] }
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
  createWaitingSaleAtomic,
  findWaitingSales,
  resumeWaitingSaleAtomic,
  findAll,
  findById,
  createTicketPrintAtomic,
  findTicketPrints,
  cancelSaleAtomic,
  updateSaleAtomic,
  getSalesByClient,
  getTotalSalesByPeriod
};
