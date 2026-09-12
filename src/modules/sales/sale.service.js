const repository = require('./sale.repository');
const productRepository = require('../products/product.repository');
const clientRepository = require('../clients/client.repository');
const { AppError } = require('../../core/errors/AppError');
const { prisma } = require('../../lib/prisma');

const TAX_RATE = 0.14; // IVA 14% en Uruguay

const PAYMENT_METHODS = new Set([
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'MERCADO_PAGO',
  'ACCOUNT_CREDIT',
]);

const PAYMENT_METHOD_ALIASES = {
  cash: 'CASH',
  efectivo: 'CASH',
  debit: 'DEBIT_CARD',
  debito: 'DEBIT_CARD',
  debit_card: 'DEBIT_CARD',
  tarjeta_debito: 'DEBIT_CARD',
  credit: 'CREDIT_CARD',
  credito: 'CREDIT_CARD',
  credit_card: 'CREDIT_CARD',
  tarjeta_credito: 'CREDIT_CARD',
  transfer: 'BANK_TRANSFER',
  transferencia: 'BANK_TRANSFER',
  bank_transfer: 'BANK_TRANSFER',
  mercado_pago: 'MERCADO_PAGO',
  mercadopago: 'MERCADO_PAGO',
  account_credit: 'ACCOUNT_CREDIT',
};

const normalizePaymentMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const method = PAYMENT_METHOD_ALIASES[normalized] || String(value || '').trim().toUpperCase();
  if (!PAYMENT_METHODS.has(method)) {
    throw new AppError('Método de pago inválido', 400, 'INVALID_PAYMENT_METHOD');
  }
  return method;
};

const normalizePayments = (saleData, total) => {
  const rawPayments = Array.isArray(saleData.payments) && saleData.payments.length
    ? saleData.payments
    : saleData.paymentMethod
      ? [{ method: saleData.paymentMethod, amount: total }]
      : [];

  if (!rawPayments.length) {
    throw new AppError('Debe indicar al menos un medio de pago', 400, 'PAYMENT_REQUIRED');
  }

  const payments = rawPayments.map((payment, index) => {
    const amount = Number(payment.amount ?? payment.monto ?? payment.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(`El importe del pago ${index + 1} debe ser mayor a cero`, 400, 'INVALID_PAYMENT_AMOUNT');
    }
    return {
      method: normalizePaymentMethod(payment.method ?? payment.paymentMethod ?? payment.metodo),
      amount,
      reference: payment.reference ?? payment.referencia ?? null,
      notes: payment.notes ?? payment.notas ?? null,
    };
  });

  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (Math.abs(paidTotal - total) > 0.01) {
    throw new AppError('La suma de los pagos debe coincidir con el total de la venta', 400, 'PAYMENT_TOTAL_MISMATCH');
  }

  return payments;
};

const create = async (data, clinicId) => {
  return await repository.create(data, clinicId);
};

const createSale = async (saleData, clinicId) => {
  const { clientId, petId, consultationId, items, discount = 0, cashShiftId, userId } = saleData;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('La venta debe incluir al menos un item', 400);
  }

  // Validar que el cliente existe
  const client = await clientRepository.findById(clientId, clinicId);
  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  // Validar mascota si se proporciona
  if (petId) {
    const pet = await prisma.pet.findFirst({
      where: { id: petId, clinicId, clientId }
    });
    if (!pet) {
      throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
    }
  }

  // Validar y obtener productos
  const productIds = items
    .filter(item => item.itemType === 'product')
    .map(item => item.itemId);

  const products = await productRepository.findByIds(productIds, clinicId);

  // Crear mapa de productos para validación rápida
  const productMap = new Map(products.map(p => [p.id, p]));

  // Validar stock y preparar items
  const processedItems = [];
  const stockMovements = [];

  for (const item of items) {
    if (item.itemType === 'product') {
      const product = productMap.get(item.itemId);
      if (!product) {
        throw new AppError(`Producto ${item.itemId} no encontrado`, 404);
      }

      if (!product.isActive) {
        throw new AppError(`Producto ${product.name} no está activo`, 400);
      }

      if (product.stock < item.quantity) {
        throw new AppError(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${item.quantity}`, 400);
      }

      // Preparar item para la venta
      processedItems.push({
        itemType: 'product',
        itemId: item.itemId,
        nameSnapshot: product.name,
        priceSnapshot: product.price,
        quantity: item.quantity,
        subtotal: product.price * item.quantity
      });

      // Preparar movimiento de stock
      stockMovements.push({
        productId: item.itemId,
        type: 'out',
        quantity: -item.quantity, // negativo para salida
        reason: 'Venta',
        notes: `Venta a cliente ${client.name}`
      });
    } else if (item.itemType === 'service') {
      // Para servicios, asumir que vienen con precio y nombre
      processedItems.push({
        itemType: 'service',
        itemId: item.itemId,
        nameSnapshot: item.nameSnapshot,
        priceSnapshot: item.priceSnapshot,
        quantity: item.quantity,
        subtotal: item.priceSnapshot * item.quantity
      });
    }
  }

  // Calcular totales
  const subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100; // descuento en porcentaje
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * TAX_RATE;
  const total = taxableAmount + tax;

  if (cashShiftId == null && Array.isArray(saleData.payments)) {
    throw new AppError('El turno de caja es obligatorio para registrar pagos', 400, 'CASH_SHIFT_REQUIRED');
  }
  const payments = normalizePayments(saleData, total);

  // Preparar datos de la venta
  const salePayload = {
    clientId,
    petId,
    consultationId,
    subtotal,
    discount: discountAmount,
    tax,
    total,
    paymentMethod: payments[0].method,
    status: 'completed'
  };

  if (cashShiftId != null) {
    salePayload.cashShiftId = Number(cashShiftId);
    salePayload.userId = userId == null ? null : Number(userId);
    salePayload.payments = payments;
  }

  // Crear venta con movimientos de stock en transacción atómica
  const sale = await repository.createWithStockMovements(
    salePayload,
    processedItems,
    stockMovements,
    clinicId
  );

  return sale;
};

const getAll = async (clinicId) => {
  return await repository.findAll(clinicId);
};

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) {
    throw new AppError('Venta no encontrada', 404);
  }
  return item;
};

const getSalesByClient = async (clientId, clinicId) => {
  // Validar que el cliente existe
  const client = await clientRepository.findById(clientId, clinicId);
  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  return await repository.getSalesByClient(clientId, clinicId);
};

const getSalesReport = async (startDate, endDate, clinicId) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new AppError('Fecha de inicio no puede ser posterior a la fecha fin', 400);
  }

  return await repository.getTotalSalesByPeriod(start, end, clinicId);
};

const cancelSaleLegacy = async (id, clinicId) => {
  const sale = await getById(id, clinicId);

  if (sale.status === 'cancelled') {
    throw new AppError('La venta ya está cancelada', 400);
  }

  // Revertir movimientos de stock
  await prisma.$transaction(async (tx) => {
    // Actualizar estado de la venta
    await tx.sale.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    // Revertir stock para productos
    for (const item of sale.saleItems) {
      if (item.itemType === 'product') {
        await tx.product.update({
          where: { id: item.itemId },
          data: {
            stock: { increment: item.quantity }
          }
        });

        // Registrar movimiento de ajuste
        await tx.stockMovement.create({
          data: {
            productId: item.itemId,
            type: 'adjustment',
            quantity: item.quantity,
            reason: 'Cancelación de venta',
            referenceType: 'sale',
            referenceId: id,
            notes: `Reversión de venta cancelada`
          }
        });
      }
    }
  });

  return { message: 'Venta cancelada exitosamente' };
};

const buildPrintData = (sale, print) => ({
  type: print.type === 'DUPLICATE' ? 'TICKET DUPLICADO' : 'TICKET ORIGINAL',
  printType: print.type,
  printId: print.id,
  reprintNumber: print.reprintNumber,
  saleId: sale.id,
  client: sale.client,
  pet: sale.pet,
  items: sale.saleItems.map((item) => ({
    name: item.nameSnapshot,
    quantity: item.quantity,
    price: item.priceSnapshot,
    subtotal: item.subtotal,
  })),
  subtotal: sale.subtotal,
  discount: sale.discount,
  tax: sale.tax,
  total: sale.total,
  payments: sale.payments.filter((payment) => Number(payment.amount) > 0).map((payment) => ({
    method: payment.method,
    amount: Number(payment.amount),
  })),
});

const printSale = async (saleId, clinicId, userId, reason) => {
  const result = await repository.createTicketPrintAtomic({ saleId, clinicId, userId, reason });
  return {
    print: result.print,
    sale: result.sale,
    printData: buildPrintData(result.sale, result.print),
  };
};

const getPrintHistory = async (saleId, clinicId) => repository.findTicketPrints(saleId, clinicId);

const prepareModifiedItems = async (items, clinicId, clientName) => {
  if (!Array.isArray(items) || items.length === 0) throw new AppError('La venta debe incluir al menos un item', 400);

  const productIds = items.filter((item) => item.itemType === 'product').map((item) => item.itemId);
  const products = await productRepository.findByIds(productIds, clinicId);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const processedItems = [];
  const stockMovements = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
    if (item.itemType === 'product') {
      const product = productMap.get(item.itemId);
      if (!product) throw new AppError(`Producto ${item.itemId} no encontrado`, 404);
      if (!product.isActive) throw new AppError(`Producto ${product.name} no está activo`, 400);
      if (product.stock < quantity) throw new AppError(`Stock insuficiente para ${product.name}`, 400, 'INSUFFICIENT_STOCK');
      processedItems.push({ itemType: 'product', itemId: item.itemId, nameSnapshot: product.name, priceSnapshot: product.price, quantity, subtotal: product.price * quantity });
      stockMovements.push({ productId: item.itemId, type: 'out', quantity: -quantity, reason: 'Modificación de venta', notes: `Venta modificada por ${clientName}` });
    } else if (item.itemType === 'service') {
      const price = Number(item.priceSnapshot);
      if (!item.nameSnapshot || !Number.isFinite(price) || price < 0) throw new AppError('Servicio inválido', 400);
      processedItems.push({ itemType: 'service', itemId: item.itemId, nameSnapshot: item.nameSnapshot, priceSnapshot: price, quantity, subtotal: price * quantity });
    } else {
      throw new AppError('Tipo de item inválido', 400, 'INVALID_SALE_ITEM');
    }
  }
  return { processedItems, stockMovements };
};

const updateSale = async (id, saleData, clinicId, userId) => {
  const sale = await getById(id, clinicId);
  if (sale.status === 'cancelled') throw new AppError('No puede modificarse una venta cancelada', 400);
  if (!sale.cashShiftId || !sale.cashShift || sale.cashShift.status !== 'OPEN') {
    throw new AppError('No puede modificarse este ticket porque el turno ya fue cerrado', 400, 'CASH_SHIFT_CLOSED');
  }

  const { processedItems, stockMovements } = await prepareModifiedItems(saleData.items, clinicId, sale.client.name);
  const subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountRate = Number(saleData.discount ?? 0);
  if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) throw new AppError('El descuento debe estar entre 0 y 100', 400, 'INVALID_DISCOUNT');
  const discount = subtotal * discountRate / 100;
  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + tax;
  const payments = normalizePayments({ ...saleData, cashShiftId: sale.cashShiftId }, total);

  return repository.updateSaleAtomic({
    id,
    clinicId,
    userId,
    saleData: { subtotal, discount, tax, total, paymentMethod: payments[0].method, status: 'completed' },
    items: processedItems,
    stockMovements,
    payments,
    reason: saleData.reason || saleData.motivo || null,
  });
};

const cancelSalePhase4 = async (id, clinicId, userId, reason) => {
  if (typeof repository.cancelSaleAtomic !== 'function') {
    throw new AppError('Venta no encontrada', 404);
  }
  return repository.cancelSaleAtomic({ id, clinicId, userId, reason });
};

module.exports = {
  create,
  createSale,
  getAll,
  getById,
  getSalesByClient,
  getSalesReport,
  updateSale,
  cancelSale: cancelSalePhase4,
  printSale,
  getPrintHistory,
};
