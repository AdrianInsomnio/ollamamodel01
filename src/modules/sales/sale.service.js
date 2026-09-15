const repository = require('./sale.repository');
const productRepository = require('../products/product.repository');
const clientRepository = require('../clients/client.repository');
const cashRegisterRepository = require('../cash/register/cashregister.repository');
const { AppError } = require('../../core/errors/AppError');
const { prisma } = require('../../lib/prisma');
const { SALE_STATUS, isCancelledStatus, isConfirmedStatus, normalizeSaleStatus } = require('./sale.status');

const TAX_RATE = 0.22; // IVA básico vigente para este MVP

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calculateFiscalAmounts = ({ unitPrice, quantity, ivaIncluded = true, ivaRate = TAX_RATE }) => {
  const priceCents = Math.round(Number(unitPrice) * 100);
  const quantityNumber = Number(quantity);
  const rate = Number(ivaRate);
  if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
    throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    throw new AppError('El precio debe ser válido y no negativo', 400, 'INVALID_PRICE');
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new AppError('La tasa de IVA no es válida', 400, 'INVALID_TAX_RATE');
  }
  const lineTotalCents = priceCents * quantityNumber;
  const netCents = ivaIncluded
    ? Math.round(lineTotalCents / (1 + rate))
    : lineTotalCents;
  const taxCents = ivaIncluded
    ? lineTotalCents - netCents
    : Math.round(netCents * rate);
  return {
    quantity: quantityNumber,
    unitPrice: priceCents / 100,
    priceSnapshot: priceCents / 100,
    ivaIncluded: ivaIncluded !== false,
    ivaRate: rate * 100,
    netAmount: netCents / 100,
    taxAmount: taxCents / 100,
    subtotal: lineTotalCents / 100,
  };
};

const calculateSaleTotals = (items, discountRateInput = 0) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + (item.netAmount ?? item.subtotal), 0));
  const discountRate = Number(discountRateInput ?? 0);
  if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
    throw new AppError('El descuento debe estar entre 0 y 100', 400, 'INVALID_DISCOUNT');
  }
  const discount = roundMoney(subtotal * discountRate / 100);
  const tax = roundMoney(items.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0) * (1 - discountRate / 100));
  return { subtotal, discount, tax, total: roundMoney(subtotal - discount + tax) };
};

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

const getServiceMap = async (items, clinicId) => {
  const serviceIds = items.filter((item) => item.itemType === 'service').map((item) => item.itemId);
  if (!serviceIds.length) return new Map();
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, clinicId } });
  return new Map(services.map((service) => [service.id, service]));
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
  const { clientId, petId, consultationId, subscriptionInstallmentIds = [], discount = 0, cashShiftId, userId } = saleData;
  const items = Array.isArray(saleData.items) ? saleData.items : [];
  const installmentIds = [...new Set((Array.isArray(subscriptionInstallmentIds) ? subscriptionInstallmentIds : []).map((id) => Number(id)))];

  if (!items.length && !installmentIds.length) {
    throw new AppError('La venta debe incluir al menos un item', 400);
  }
  if (installmentIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new AppError('Las cuotas seleccionadas son inválidas', 400, 'INVALID_INSTALLMENT_ID');
  }
  if (items.length && installmentIds.length) {
    throw new AppError('No se pueden mezclar cuotas con productos o servicios en la misma operación', 400, 'SUBSCRIPTION_MIX_NOT_SUPPORTED');
  }

  // Validar que el cliente existe
  const client = await clientRepository.findById(clientId, clinicId);
  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  // Validar mascota si se proporciona
  if (petId) {
    const pet = await prisma.pet.findFirst({
      // Pet no tiene clinicId propio; la clínica se deriva del cliente.
      where: { id: petId, clientId, client: { clinicId } }
    });
    if (!pet) {
      throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
    }
  }

  let installmentItems = [];
  if (installmentIds.length) {
    const installments = await prisma.subscriptionInstallment.findMany({
      where: {
        id: { in: installmentIds },
        clinicId,
        status: 'PENDING',
        subscription: { clientId },
      },
      include: { subscription: { include: { medicalPlan: true } } },
    });
    if (installments.length !== installmentIds.length) {
      throw new AppError('Una o más cuotas ya no están pendientes o no pertenecen al cliente', 409, 'INSTALLMENT_NOT_AVAILABLE');
    }
    const subscriptionIds = [...new Set(installments.map((item) => item.subscriptionId))];
    if (subscriptionIds.length !== 1) {
      throw new AppError('Las cuotas seleccionadas deben pertenecer a la misma suscripción', 400, 'MULTIPLE_SUBSCRIPTIONS_NOT_SUPPORTED');
    }
    installmentItems = installments.map((installment) => ({
      itemType: 'subscription_installment',
      itemId: installment.id,
      nameSnapshot: `Cuota ${installment.periodStart.toISOString().slice(0, 10)} - ${installment.periodEnd.toISOString().slice(0, 10)}`,
      priceSnapshot: Number(installment.totalAmount),
      unitPrice: Number(installment.totalAmount),
      ivaIncluded: false,
      ivaRate: 0,
      netAmount: Number(installment.totalAmount),
      taxAmount: 0,
      quantity: 1,
      subtotal: Number(installment.totalAmount),
    }));
  }

  // Validar y obtener productos
  const productIds = items
    .filter(item => item.itemType === 'product')
    .map(item => item.itemId);

  const products = await productRepository.findByIds(productIds, clinicId);

  // Crear mapa de productos para validación rápida
  const productMap = new Map(products.map(p => [p.id, p]));
  const serviceMap = await getServiceMap(items, clinicId);

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

      const isVariableProduct = product.priceType === 'VARIABLE';
      if (!isVariableProduct && product.stock < item.quantity) {
        throw new AppError(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${item.quantity}`, 400);
      }

      const salePrice = isVariableProduct
        ? Number(item.priceSnapshot)
        : Number(product.price);
      if (isVariableProduct && (!Number.isFinite(salePrice) || salePrice <= 0)) {
        throw new AppError(`El producto variable ${product.name} requiere un importe mayor que cero`, 400, 'VARIABLE_PRICE_REQUIRED');
      }

      // Preparar item para la venta
      processedItems.push({
        itemType: 'product',
        itemId: item.itemId,
        nameSnapshot: product.name,
        ...calculateFiscalAmounts({ unitPrice: salePrice, quantity: item.quantity, ivaIncluded: product.ivaIncluded !== false }),
      });

      // Preparar movimiento de stock
      if (!isVariableProduct) {
        stockMovements.push({
          productId: item.itemId,
          type: 'out',
          quantity: -item.quantity,
          reason: 'Venta',
          notes: `Venta a cliente ${client.name}`
        });
      }
    } else if (item.itemType === 'service') {
      const service = serviceMap.get(item.itemId);
      if (!service || !service.isActive) throw new AppError(`Servicio ${item.itemId} no encontrado o inactivo`, 404);
      processedItems.push({
        itemType: 'service',
        itemId: item.itemId,
        nameSnapshot: service.name,
        ...calculateFiscalAmounts({ unitPrice: service.price, quantity: item.quantity, ivaIncluded: false }),
      });
    }
  }

  // Calcular totales
  const finalItems = installmentItems.length ? installmentItems : processedItems;
  const totals = calculateSaleTotals(finalItems, discount);
  const { subtotal, discount: discountAmount, tax, total } = totals;

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
    status: SALE_STATUS.CONFIRMED
  };
  if (installmentIds.length) salePayload.subscriptionInstallmentIds = installmentIds;

  if (cashShiftId != null) {
    salePayload.cashShiftId = Number(cashShiftId);
    salePayload.userId = userId == null ? null : Number(userId);
    salePayload.payments = payments;
  }

  // Crear venta con movimientos de stock en transacción atómica
  const sale = await repository.createWithStockMovements(
    salePayload,
    finalItems,
    stockMovements,
    clinicId
  );

  return { ...sale, status: normalizeSaleStatus(sale.status) };
};

const getAll = async (clinicId, cashShiftId, userId) => {
  // La lista operativa de ventas debe quedar acotada al turno abierto actual.
  // Sin un turno solicitado no devolvemos el historial completo por accidente.
  if (cashShiftId === undefined || cashShiftId === null || cashShiftId === '') return [];

  const shiftId = Number(cashShiftId);
  if (!Number.isInteger(shiftId) || shiftId <= 0) {
    throw new AppError('El turno de caja no es válido', 400, 'INVALID_CASH_SHIFT');
  }

  const shift = await cashRegisterRepository.findShiftById(shiftId, clinicId, userId);
  if (!shift || shift.status !== 'OPEN' || !shift.cashRegister?.isActive) {
    throw new AppError('No existe un turno abierto en una caja activa', 403, 'ACTIVE_CASH_SHIFT_REQUIRED');
  }

  const sales = await repository.findAll(clinicId, shiftId);
  return (sales || []).map((sale) => ({ ...sale, status: normalizeSaleStatus(sale.status) }));
};

const getById = async (id, clinicId) => {
  const item = await repository.findById(id, clinicId);
  if (!item) {
    throw new AppError('Venta no encontrada', 404);
  }
  return { ...item, status: normalizeSaleStatus(item.status) };
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

  if (isCancelledStatus(sale.status)) {
    throw new AppError('La venta ya está cancelada', 400);
  }

  // Revertir movimientos de stock
  await prisma.$transaction(async (tx) => {
    // Actualizar estado de la venta
    await tx.sale.update({
      where: { id },
      data: { status: SALE_STATUS.CANCELLED }
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
            clinicId,
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
    unitPrice: item.unitPrice ?? item.priceSnapshot,
    ivaIncluded: item.ivaIncluded,
    ivaRate: item.ivaRate,
    netAmount: item.netAmount,
    taxAmount: item.taxAmount,
  })),
  subtotal: sale.subtotal,
  discount: sale.discount,
  tax: sale.tax,
  total: sale.total,
  taxRate: sale.saleItems.some((item) => Number(item.ivaRate) > 0) ? Math.max(...sale.saleItems.map((item) => Number(item.ivaRate))) : 0,
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

const prepareWaitingItems = async (items, clinicId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('La venta debe incluir al menos un item', 400);
  }

  const productIds = items.filter((item) => item.itemType === 'product').map((item) => item.itemId);
  const products = await productRepository.findByIds(productIds, clinicId);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const serviceMap = await getServiceMap(items, clinicId);

  return items.map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
    }

    if (item.itemType === 'product') {
      const product = productMap.get(item.itemId);
      if (!product) throw new AppError(`Producto ${item.itemId} no encontrado`, 404);
      if (!product.isActive) throw new AppError(`Producto ${product.name} no está activo`, 400);
      const isVariableProduct = product.priceType === 'VARIABLE';
      if (!isVariableProduct && product.stock < quantity) throw new AppError(`Stock insuficiente para ${product.name}`, 400, 'INSUFFICIENT_STOCK');
      const price = isVariableProduct ? Number(item.priceSnapshot) : Number(product.price);
      if (isVariableProduct && (!Number.isFinite(price) || price <= 0)) throw new AppError(`El producto variable ${product.name} requiere un importe mayor que cero`, 400, 'VARIABLE_PRICE_REQUIRED');
      return {
        itemType: 'product',
        itemId: item.itemId,
        nameSnapshot: product.name,
        ...calculateFiscalAmounts({ unitPrice: price, quantity, ivaIncluded: product.ivaIncluded !== false }),
      };
    }

    if (item.itemType === 'service') {
      const service = serviceMap.get(item.itemId);
      if (!service || !service.isActive) throw new AppError(`Servicio ${item.itemId} no encontrado o inactivo`, 404);
      return { itemType: 'service', itemId: item.itemId, nameSnapshot: service.name, ...calculateFiscalAmounts({ unitPrice: service.price, quantity, ivaIncluded: false }) };
    }

    throw new AppError('Tipo de item inválido', 400, 'INVALID_SALE_ITEM');
  });
};

const createWaitingSale = async (saleData, clinicId, userId) => {
  const cashShiftId = Number(saleData.cashShiftId);
  if (!Number.isInteger(cashShiftId)) throw new AppError('El turno de caja es obligatorio para guardar una cuenta en espera', 400, 'CASH_SHIFT_REQUIRED');

  const client = await clientRepository.findById(saleData.clientId, clinicId);
  if (!client) throw new AppError('Cliente no encontrado', 404);
  if (saleData.petId) {
    // La mascota no tiene clinicId propio; el cliente ya fue validado dentro de la clínica.
    const pet = await prisma.pet.findFirst({ where: { id: saleData.petId, clientId: saleData.clientId } });
    if (!pet) throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
  }

  const items = await prepareWaitingItems(saleData.items, clinicId);
  const { subtotal, discount, tax, total } = calculateSaleTotals(items, saleData.discount);

  const waitingPayload = { clientId: saleData.clientId, petId: saleData.petId, consultationId: saleData.consultationId, subtotal, discount, tax, total, notes: saleData.notes || null };
  const sale = saleData.draftId
    ? await repository.transitionDraftToWaitingAtomic({ id: Number(saleData.draftId), saleData: waitingPayload, items, clinicId, userId, cashShiftId })
    : await repository.createWaitingSaleAtomic({ saleData: waitingPayload, items, clinicId, userId, cashShiftId });
  return { ...sale, status: normalizeSaleStatus(sale.status) };
};

const createDraftSale = async (saleData, clinicId, userId) => {
  const client = await clientRepository.findById(saleData.clientId, clinicId);
  if (!client) throw new AppError('Cliente no encontrado', 404);
  if (saleData.petId) {
    const pet = await prisma.pet.findFirst({ where: { id: saleData.petId, clientId: saleData.clientId } });
    if (!pet) throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
  }

  const items = await prepareWaitingItems(saleData.items, clinicId);
  const totals = calculateSaleTotals(items, saleData.discount);
  const sale = await repository.createDraftSaleAtomic({
    saleData: {
      clientId: saleData.clientId,
      petId: saleData.petId || null,
      consultationId: saleData.consultationId || null,
      ...totals,
      notes: saleData.notes || null,
    },
    items,
    clinicId,
    userId,
  });
  return { ...sale, status: normalizeSaleStatus(sale.status) };
};

const getDraftSales = async (clinicId, userId) => {
  const sales = await repository.findDraftSales(clinicId, userId);
  return sales.map((sale) => ({ ...sale, status: normalizeSaleStatus(sale.status) }));
};

const getWaitingSales = async (cashShiftId, clinicId, userId) => {
  const shift = await cashRegisterRepository.findShiftById(cashShiftId, clinicId, userId);
  if (!shift || shift.status !== 'OPEN') throw new AppError('El turno de caja no existe o está cerrado', 400, 'CASH_SHIFT_CLOSED');
  const sales = await repository.findWaitingSales(cashShiftId, clinicId);
  return sales.map((sale) => ({ ...sale, status: normalizeSaleStatus(sale.status) }));
};

const resumeWaitingSale = async (id, clinicId, userId) => {
  const sale = await repository.resumeWaitingSaleAtomic({ id, clinicId, userId });
  return { ...sale, status: normalizeSaleStatus(sale.status) };
};

const getPrintHistory = async (saleId, clinicId) => repository.findTicketPrints(saleId, clinicId);

const prepareModifiedItems = async (items, clinicId, clientName) => {
  if (!Array.isArray(items) || items.length === 0) throw new AppError('La venta debe incluir al menos un item', 400);

  const productIds = items.filter((item) => item.itemType === 'product').map((item) => item.itemId);
  const products = await productRepository.findByIds(productIds, clinicId);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const serviceMap = await getServiceMap(items, clinicId);
  const processedItems = [];
  const stockMovements = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new AppError('La cantidad debe ser mayor a cero', 400, 'INVALID_QUANTITY');
    if (item.itemType === 'product') {
      const product = productMap.get(item.itemId);
      if (!product) throw new AppError(`Producto ${item.itemId} no encontrado`, 404);
      if (!product.isActive) throw new AppError(`Producto ${product.name} no está activo`, 400);
      const isVariableProduct = product.priceType === 'VARIABLE';
      if (!isVariableProduct && product.stock < quantity) throw new AppError(`Stock insuficiente para ${product.name}`, 400, 'INSUFFICIENT_STOCK');
      const price = isVariableProduct ? Number(item.priceSnapshot) : Number(product.price);
      if (isVariableProduct && (!Number.isFinite(price) || price <= 0)) throw new AppError(`El producto variable ${product.name} requiere un importe mayor que cero`, 400, 'VARIABLE_PRICE_REQUIRED');
      processedItems.push({ itemType: 'product', itemId: item.itemId, nameSnapshot: product.name, ...calculateFiscalAmounts({ unitPrice: price, quantity, ivaIncluded: product.ivaIncluded !== false }) });
      if (!isVariableProduct) stockMovements.push({ productId: item.itemId, type: 'out', quantity: -quantity, reason: 'Modificación de venta', notes: `Venta modificada por ${clientName}` });
    } else if (item.itemType === 'service') {
      const service = serviceMap.get(item.itemId);
      if (!service || !service.isActive) throw new AppError(`Servicio ${item.itemId} no encontrado o inactivo`, 404);
      processedItems.push({ itemType: 'service', itemId: item.itemId, nameSnapshot: service.name, ...calculateFiscalAmounts({ unitPrice: service.price, quantity, ivaIncluded: false }) });
    } else {
      throw new AppError('Tipo de item inválido', 400, 'INVALID_SALE_ITEM');
    }
  }
  return { processedItems, stockMovements };
};

const updateSale = async (id, saleData, clinicId, userId) => {
  const sale = await getById(id, clinicId);
  if (isCancelledStatus(sale.status)) throw new AppError('No puede modificarse una venta cancelada', 400);
  if (normalizeSaleStatus(sale.status) === SALE_STATUS.DRAFT && !saleData.paymentMethod && !saleData.confirm) {
    const clientId = saleData.clientId ?? sale.clientId;
    const petId = saleData.petId ?? sale.petId;
    const client = await clientRepository.findById(clientId, clinicId);
    if (!client) throw new AppError('Cliente no encontrado', 404);
    if (petId) {
      const pet = await prisma.pet.findFirst({ where: { id: petId, clientId } });
      if (!pet) throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
    }
    const items = await prepareWaitingItems(saleData.items, clinicId);
    const totals = calculateSaleTotals(items, saleData.discount);
    const updated = await repository.updateDraftSaleAtomic({
      id,
      clinicId,
      userId,
      saleData: { ...totals, clientId, petId, consultationId: saleData.consultationId ?? sale.consultationId, notes: saleData.notes ?? sale.notes },
      items,
    });
    return { ...updated, status: normalizeSaleStatus(updated.status) };
  }
  const effectiveCashShiftId = saleData.cashShiftId ?? sale.cashShiftId;
  const effectiveShift = sale.cashShiftId === effectiveCashShiftId
    ? sale.cashShift
    : await cashRegisterRepository.findShiftById(Number(effectiveCashShiftId), clinicId, userId);
  if (!effectiveCashShiftId || !effectiveShift || effectiveShift.status !== 'OPEN') {
    throw new AppError('No puede modificarse este ticket porque el turno ya fue cerrado', 400, 'CASH_SHIFT_CLOSED');
  }

  const { processedItems, stockMovements } = await prepareModifiedItems(saleData.items, clinicId, sale.client.name);
  const { subtotal, discount, tax, total } = calculateSaleTotals(processedItems, saleData.discount);
  const payments = normalizePayments({ ...saleData, cashShiftId: effectiveCashShiftId }, total);

  return repository.updateSaleAtomic({
    id,
    clinicId,
    userId,
    saleData: { subtotal, discount, tax, total, paymentMethod: payments[0].method, status: SALE_STATUS.CONFIRMED, cashShiftId: effectiveCashShiftId },
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

const returnSale = async (id, items, clinicId, userId) => {
  if (!Array.isArray(items) || items.length === 0) throw new AppError('La devolución debe incluir al menos un producto', 400, 'RETURN_ITEMS_REQUIRED');
  if (typeof repository.returnSaleStockAtomic !== 'function') throw new AppError('El flujo de devoluciones no está disponible', 500);
  return repository.returnSaleStockAtomic({ id, items, clinicId, userId });
};

const correctSale = async (id, saleData, clinicId, userId) => {
  const original = await getById(id, clinicId);
  if (!isConfirmedStatus(original.status)) throw new AppError('Solo pueden corregirse ventas confirmadas', 400, 'SALE_NOT_CONFIRMED');
  const clientId = saleData.clientId ?? original.clientId;
  const petId = saleData.petId ?? original.petId;
  if (!await clientRepository.findById(clientId, clinicId)) throw new AppError('Cliente no encontrado', 404);
  if (petId && !await prisma.pet.findFirst({ where: { id: petId, clientId } })) throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
  const items = await prepareWaitingItems(saleData.items, clinicId);
  const totals = calculateSaleTotals(items, saleData.discount);
  const result = await repository.correctSaleAtomic({
    id, clinicId, userId,
    reason: saleData.reason || saleData.motivo || null,
    saleData: { clientId, petId, consultationId: saleData.consultationId ?? original.consultationId, ...totals, notes: saleData.notes || null },
    items,
  });
  return { ...result, original: { ...result.original, status: SALE_STATUS.CANCELLED }, waiting: { ...result.waiting, status: SALE_STATUS.WAITING } };
};

module.exports = {
  create,
  createSale,
  createWaitingSale,
  createDraftSale,
  getDraftSales,
  getWaitingSales,
  resumeWaitingSale,
  getAll,
  getById,
  getSalesByClient,
  getSalesReport,
  updateSale,
  cancelSale: cancelSalePhase4,
  returnSale,
  correctSale,
  printSale,
  getPrintHistory,
};
