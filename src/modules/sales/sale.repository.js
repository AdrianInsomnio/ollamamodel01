const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../core/errors/AppError');
const { SALE_STATUS, LEGACY_SALE_STATUS, isDraftStatus, isWaitingStatus, isConfirmedStatus, isCancelledStatus, normalizeSaleStatus } = require('./sale.status');

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
          unitPrice: item.unitPrice ?? item.priceSnapshot,
          ivaIncluded: item.ivaIncluded ?? false,
          ivaRate: item.ivaRate ?? 0,
          netAmount: item.netAmount ?? item.subtotal,
          taxAmount: item.taxAmount ?? 0,
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
    const { payments = [], subscriptionInstallmentIds = [], ...persistedSaleData } = saleData;

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
        updatedAt: new Date(),
        saleItems: {
          create: items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            nameSnapshot: item.nameSnapshot,
            priceSnapshot: item.priceSnapshot,
            unitPrice: item.unitPrice ?? item.priceSnapshot,
            ivaIncluded: item.ivaIncluded ?? false,
            ivaRate: item.ivaRate ?? 0,
            netAmount: item.netAmount ?? item.subtotal,
            taxAmount: item.taxAmount ?? 0,
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

    if (subscriptionInstallmentIds.length) {
      const available = await tx.subscriptionInstallment.findMany({
        where: {
          id: { in: subscriptionInstallmentIds },
          clinicId,
          status: 'PENDING',
          subscription: { clientId: persistedSaleData.clientId },
        },
        select: { id: true },
      });
      if (available.length !== subscriptionInstallmentIds.length) {
        throw new AppError('Una o más cuotas ya fueron cobradas o no pertenecen al cliente', 409, 'INSTALLMENT_ALREADY_PROCESSED');
      }
      const paid = await tx.subscriptionInstallment.updateMany({
        where: {
          id: { in: subscriptionInstallmentIds },
          clinicId,
          status: 'PENDING',
        },
        data: { status: 'PAID', paidAt: new Date(), saleId: sale.id },
      });
      if (paid.count !== subscriptionInstallmentIds.length) {
        throw new AppError('Una o más cuotas ya fueron cobradas por otra operación', 409, 'INSTALLMENT_ALREADY_PROCESSED');
      }
    }

    // Registrar movimientos de stock
    for (const movement of stockMovements) {
      // Actualizar stock del producto
      const updated = await tx.product.updateMany({
        where: { id: movement.productId, clinicId, stock: { gte: Math.abs(movement.quantity) } },
        data: {
          stock: {
            decrement: Math.abs(movement.quantity)
          }
        }
      });
      if (updated.count !== 1) {
        throw new AppError('Stock insuficiente o producto fuera de la clínica activa', 409, 'INSUFFICIENT_STOCK');
      }
      await tx.stockMovement.create({
        data: {
          ...movement,
          clinicId,
          referenceType: 'sale',
          referenceId: sale.id
        }
      });
    }

    return sale;
  });
};

const findAll = async (clinicId, cashShiftId) => {
  return await prisma.sale.findMany({
    where: { clinicId, ...(cashShiftId ? { cashShiftId } : {}) },
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
      subscriptionInstallments: true,
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
        updatedAt: new Date(),
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

const transitionDraftToWaitingAtomic = async ({ id, saleData, items, clinicId, userId, cashShiftId }) => {
  return prisma.$transaction(async (tx) => {
    const shift = await tx.cashShift.findFirst({ where: { id: cashShiftId, clinicId, userId, status: 'OPEN' }, include: { cashRegister: true } });
    if (!shift) throw new AppError('El turno de caja no existe, no pertenece a la clínica o está cerrado', 400, 'INVALID_CASH_SHIFT');
    const draft = await tx.sale.findFirst({ where: { id, clinicId, userId, status: { in: [SALE_STATUS.DRAFT, LEGACY_SALE_STATUS.DRAFT] } } });
    if (!draft) throw new AppError('Borrador no encontrado', 404, 'DRAFT_NOT_FOUND');

    await tx.saleItem.deleteMany({ where: { saleId: id } });
    const sale = await tx.sale.update({
      where: { id },
      data: { ...saleData, status: SALE_STATUS.WAITING, cashShiftId, userId, paymentMethod: null, updatedAt: new Date(), saleItems: { create: items } },
      include: { client: { select: { id: true, name: true } }, pet: { select: { id: true, name: true } }, saleItems: true, payments: true, cashShift: { include: { cashRegister: true } } },
    });
    await tx.cashAuditEvent.create({ data: { action: 'SALE_WAITING', clinicId, userId, cashRegisterId: shift.cashRegisterId, cashShiftId, saleId: id, details: { status: SALE_STATUS.WAITING, fromStatus: SALE_STATUS.DRAFT, total: sale.total } } });
    return sale;
  });
};

const createDraftSaleAtomic = async ({ saleData, items, clinicId, userId }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        ...saleData,
        clinicId,
        userId,
        cashShiftId: null,
        paymentMethod: null,
        status: SALE_STATUS.DRAFT,
        updatedAt: new Date(),
        saleItems: { create: items },
      },
      include: {
        client: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        saleItems: true,
        payments: true,
      },
    });

    await tx.cashAuditEvent.create({
      data: {
        action: 'SALE_DRAFT_CREATED',
        clinicId,
        userId,
        saleId: sale.id,
        details: { status: SALE_STATUS.DRAFT, total: sale.total },
      },
    });

    return sale;
  });
};

const findDraftSales = async (clinicId, userId) => prisma.sale.findMany({
  where: {
    clinicId,
    userId,
    status: { in: [SALE_STATUS.DRAFT, LEGACY_SALE_STATUS.DRAFT] },
  },
  include: {
    client: { select: { id: true, name: true } },
    pet: { select: { id: true, name: true } },
    saleItems: true,
  },
  orderBy: { updatedAt: 'desc' },
});

const updateDraftSaleAtomic = async ({ id, clinicId, userId, saleData, items }) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.sale.findFirst({
      where: { id, clinicId, userId, status: { in: [SALE_STATUS.DRAFT, LEGACY_SALE_STATUS.DRAFT] } },
      select: { id: true, status: true },
    });
    if (!current) throw new AppError('Borrador no encontrado', 404, 'DRAFT_NOT_FOUND');

    await tx.saleItem.deleteMany({ where: { saleId: id } });
    const sale = await tx.sale.update({
      where: { id },
      data: {
        ...saleData,
        status: SALE_STATUS.DRAFT,
        cashShiftId: null,
        paymentMethod: null,
        payments: { deleteMany: {} },
        saleItems: { create: items },
      },
      include: {
        client: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        saleItems: true,
        payments: true,
      },
    });

    await tx.cashAuditEvent.create({
      data: {
        action: 'SALE_DRAFT_AUTOSAVED',
        clinicId,
        userId,
        saleId: id,
        details: { status: SALE_STATUS.DRAFT, total: sale.total },
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
        // Los borradores no tienen turno asociado hasta el cobro.
        // En ese caso la caja válida es la del turno efectivo recibido.
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
    const pendingSale = isWaitingStatus(sale.status) || isDraftStatus(sale.status);
    if (!pendingSale && (!sale.cashShift || sale.cashShift.status !== 'OPEN')) {
      throw new AppError('No puede cancelarse este ticket porque el turno ya fue cerrado', 400, 'CASH_SHIFT_CLOSED');
    }
    if (userId != null && (pendingSale ? sale.userId !== userId : sale.cashShift.userId !== userId)) {
      throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');
    }

    await tx.$queryRaw`
      SELECT id
      FROM sales
      WHERE id = ${id} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    await tx.sale.update({ where: { id }, data: { status: SALE_STATUS.CANCELLED } });

    if (!pendingSale) {
      await tx.subscriptionInstallment.updateMany({
        where: { saleId: id, status: 'PAID' },
        data: { status: 'PENDING', paidAt: null, saleId: null },
      });
    }

    for (const item of sale.saleItems) {
      if (pendingSale) continue;
      if (item.itemType !== 'product') continue;
      await tx.product.update({ where: { id: item.itemId, clinicId }, data: { stock: { increment: item.quantity } } });
      await tx.stockMovement.create({
        data: {
          productId: item.itemId,
          clinicId,
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
        cashRegisterId: sale.cashShift?.cashRegisterId || null,
        cashShiftId: sale.cashShiftId || null,
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

const correctSaleAtomic = async ({ id, clinicId, userId, reason, saleData, items }) => {
  return prisma.$transaction(async (tx) => {
    const original = await tx.sale.findFirst({
      where: { id, clinicId },
      include: { saleItems: true, payments: true, cashShift: { include: { cashRegister: true } } },
    });
    if (!original) throw new AppError('Venta no encontrada', 404);
    if (!isConfirmedStatus(original.status)) throw new AppError('Solo pueden corregirse ventas confirmadas', 400, 'SALE_NOT_CONFIRMED');
    if (!original.cashShift || original.cashShift.status !== 'OPEN') throw new AppError('No puede corregirse una venta con turno cerrado', 400, 'CASH_SHIFT_CLOSED');
    if (userId != null && original.cashShift.userId !== userId) throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');

    await tx.$queryRaw`SELECT id FROM sales WHERE id = ${id} AND clinicId = ${clinicId} FOR UPDATE`;
    await tx.sale.update({ where: { id }, data: { status: SALE_STATUS.CANCELLED } });

    await tx.subscriptionInstallment.updateMany({
      where: { saleId: id, status: 'PAID' },
      data: { status: 'PENDING', paidAt: null, saleId: null },
    });

    for (const item of original.saleItems) {
      if (item.itemType !== 'product') continue;
      await tx.product.update({ where: { id: item.itemId, clinicId }, data: { stock: { increment: item.quantity } } });
      await tx.stockMovement.create({ data: {
        productId: item.itemId, clinicId, type: 'adjustment', quantity: item.quantity,
        reason: 'Corrección de venta', referenceType: 'sale', referenceId: id,
        notes: reason || `Reversión para corregir venta #${id}`,
      } });
    }
    for (const payment of original.payments) {
      await tx.payment.create({ data: {
        id: require('node:crypto').randomUUID(), saleId: id, cashShiftId: original.cashShiftId,
        amount: -Number(payment.amount), method: payment.method,
        reference: `CORRECTION:${payment.id}`, notes: reason || `Reversión para corregir venta #${id}`,
      } });
    }

    const waiting = await tx.sale.create({
      data: {
        ...saleData, clinicId, userId, cashShiftId: original.cashShiftId,
        status: SALE_STATUS.WAITING, paymentMethod: null, updatedAt: new Date(),
        notes: saleData.notes || `Corrección de venta #${id}`,
        saleItems: { create: items },
      },
      include: { client: { select: { id: true, name: true } }, pet: { select: { id: true, name: true } }, saleItems: true, payments: true, cashShift: { include: { cashRegister: true } } },
    });

    await tx.cashAuditEvent.create({ data: {
      action: 'SALE_CORRECTED', clinicId, userId,
      cashRegisterId: original.cashShift.cashRegisterId, cashShiftId: original.cashShiftId, saleId: id,
      details: { reason: reason || null, correctionSaleId: waiting.id, reversedPaymentIds: original.payments.map((payment) => payment.id) },
    } });
    return { original: { ...original, status: SALE_STATUS.CANCELLED }, waiting };
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
    const pendingSale = isWaitingStatus(sale.status) || isDraftStatus(sale.status);
    const effectiveCashShiftId = pendingSale
      ? (saleData.cashShiftId || sale.cashShiftId || null)
      : (sale.cashShiftId || null);
    const effectiveShift = effectiveCashShiftId === sale.cashShiftId
      ? sale.cashShift
      : effectiveCashShiftId
        ? await tx.cashShift.findFirst({ where: { id: effectiveCashShiftId, clinicId, status: 'OPEN' } })
        : null;
    if (!effectiveShift || effectiveShift.status !== 'OPEN') {
      throw new AppError('No puede modificarse este ticket porque el turno ya fue cerrado', 400, 'CASH_SHIFT_CLOSED');
    }
    if (userId != null && effectiveShift.userId !== userId) {
      throw new AppError('El usuario no tiene acceso al turno de caja', 403, 'CASH_SHIFT_ACCESS_DENIED');
    }

    await tx.$queryRaw`
      SELECT id
      FROM sales
      WHERE id = ${id} AND clinicId = ${clinicId}
      FOR UPDATE
    `;

    for (const item of sale.saleItems) {
      if (!pendingSale && item.itemType === 'product') {
        await tx.product.update({ where: { id: item.itemId, clinicId }, data: { stock: { increment: item.quantity } } });
      }
    }
    for (const movement of stockMovements) {
      const updated = await tx.product.updateMany({
        where: { id: movement.productId, clinicId, stock: { gte: Math.abs(movement.quantity) } },
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
          clinicId,
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
        cashShiftId: effectiveCashShiftId,
        userId,
        saleItems: { create: items },
        payments: {
          create: payments.map((payment) => ({
            id: require('node:crypto').randomUUID(),
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            notes: payment.notes,
            cashShiftId: effectiveCashShiftId,
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
        // Los borradores no tienen turno asociado hasta el cobro.
        // En ese caso la caja válida es la del turno efectivo recibido.
        cashRegisterId: effectiveShift.cashRegisterId,
        cashShiftId: effectiveCashShiftId,
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

const returnSaleStockAtomic = async ({ id, clinicId, userId, items }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, clinicId },
      include: { saleItems: true },
    });
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (!isConfirmedStatus(sale.status)) throw new AppError('Solo pueden devolverse ventas confirmadas', 400, 'SALE_NOT_CONFIRMED');

    const soldByProduct = new Map();
    for (const item of sale.saleItems) {
      if (item.itemType === 'product') soldByProduct.set(item.itemId, (soldByProduct.get(item.itemId) || 0) + item.quantity);
    }
    const previousReturns = await tx.stockMovement.findMany({
      where: { clinicId, referenceType: 'sale', referenceId: id, type: 'return' },
      select: { productId: true, quantity: true },
    });
    const returnedByProduct = new Map();
    for (const movement of previousReturns) returnedByProduct.set(movement.productId, (returnedByProduct.get(movement.productId) || 0) + movement.quantity);

    const returned = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) throw new AppError('Los productos y cantidades de la devolución son inválidos', 400, 'INVALID_RETURN_ITEM');
      const sold = soldByProduct.get(productId) || 0;
      const alreadyReturned = returnedByProduct.get(productId) || 0;
      if (sold === 0 || alreadyReturned + quantity > sold) throw new AppError('La cantidad devuelta supera la cantidad vendida', 400, 'RETURN_QUANTITY_EXCEEDED');

      const updated = await tx.product.updateMany({ where: { id: productId, clinicId }, data: { stock: { increment: quantity } } });
      if (updated.count !== 1) throw new AppError('Producto no encontrado en la clínica activa', 404);
      await tx.stockMovement.create({ data: { productId, clinicId, type: 'return', quantity, reason: 'Devolución de venta', referenceType: 'sale', referenceId: id, userId: userId ?? null, notes: item.notes || null } });
      returned.push({ productId, quantity });
      returnedByProduct.set(productId, alreadyReturned + quantity);
    }
    return { saleId: id, returned };
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
  transitionDraftToWaitingAtomic,
  createDraftSaleAtomic,
  findDraftSales,
  updateDraftSaleAtomic,
  findWaitingSales,
  resumeWaitingSaleAtomic,
  findAll,
  findById,
  createTicketPrintAtomic,
  findTicketPrints,
  cancelSaleAtomic,
  correctSaleAtomic,
  updateSaleAtomic,
  getSalesByClient,
  returnSaleStockAtomic,
  getTotalSalesByPeriod
};
