const repository = require('./sale.repository');
const productRepository = require('../products/product.repository');
const clientRepository = require('../clients/client.repository');
const { AppError } = require('../../core/errors/AppError');
const { prisma } = require('../../lib/prisma');

const TAX_RATE = 0.14; // IVA 14% en Uruguay

const create = async (data, organizationId) => {
  return await repository.create(data, organizationId);
};

const createSale = async (saleData, organizationId) => {
  const { clientId, petId, consultationId, items, discount = 0, paymentMethod } = saleData;

  // Validar que el cliente existe
  const client = await clientRepository.findById(clientId, organizationId);
  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  // Validar mascota si se proporciona
  if (petId) {
    const pet = await prisma.pet.findFirst({
      where: { id: petId, organizationId, clientId }
    });
    if (!pet) {
      throw new AppError('Mascota no encontrada o no pertenece al cliente', 404);
    }
  }

  // Validar y obtener productos
  const productIds = items
    .filter(item => item.itemType === 'product')
    .map(item => item.itemId);

  const products = await productRepository.findByIds(productIds, organizationId);

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

  // Preparar datos de la venta
  const salePayload = {
    clientId,
    petId,
    consultationId,
    subtotal,
    discount: discountAmount,
    tax,
    total,
    paymentMethod,
    status: 'completed'
  };

  // Crear venta con movimientos de stock en transacción atómica
  const sale = await repository.createWithStockMovements(
    salePayload,
    processedItems,
    stockMovements,
    organizationId
  );

  return sale;
};

const getAll = async (organizationId) => {
  return await repository.findAll(organizationId);
};

const getById = async (id, organizationId) => {
  const item = await repository.findById(id, organizationId);
  if (!item) {
    throw new AppError('Venta no encontrada', 404);
  }
  return item;
};

const getSalesByClient = async (clientId, organizationId) => {
  // Validar que el cliente existe
  const client = await clientRepository.findById(clientId, organizationId);
  if (!client) {
    throw new AppError('Cliente no encontrado', 404);
  }

  return await repository.getSalesByClient(clientId, organizationId);
};

const getSalesReport = async (startDate, endDate, organizationId) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new AppError('Fecha de inicio no puede ser posterior a la fecha fin', 400);
  }

  return await repository.getTotalSalesByPeriod(start, end, organizationId);
};

const cancelSale = async (id, organizationId) => {
  const sale = await getById(id, organizationId);

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
    for (const item of sale.items) {
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

module.exports = {
  create,
  createSale,
  getAll,
  getById,
  getSalesByClient,
  getSalesReport,
  cancelSale
};
