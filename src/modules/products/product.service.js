const repository = require('./product.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, organizationId) => {
  // Validar datos requeridos
  if (!data.name || !data.price) {
    throw new AppError('Nombre y precio son requeridos', 400);
  }

  if (data.price <= 0) {
    throw new AppError('El precio debe ser mayor a 0', 400);
  }

  if (data.cost && data.cost < 0) {
    throw new AppError('El costo no puede ser negativo', 400);
  }

  if (data.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400);
  }

  if (data.minStock < 0) {
    throw new AppError('El stock mínimo no puede ser negativo', 400);
  }

  return await repository.create(data, organizationId);
};

const getAll = async (organizationId) => {
  return await repository.findAll(organizationId);
};

const getById = async (id, organizationId) => {
  const product = await repository.findById(id, organizationId);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }
  return product;
};

const update = async (id, organizationId, data) => {
  const product = await getById(id, organizationId);

  // Validaciones
  if (data.price !== undefined && data.price <= 0) {
    throw new AppError('El precio debe ser mayor a 0', 400);
  }

  if (data.cost !== undefined && data.cost < 0) {
    throw new AppError('El costo no puede ser negativo', 400);
  }

  if (data.stock !== undefined && data.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400);
  }

  if (data.minStock !== undefined && data.minStock < 0) {
    throw new AppError('El stock mínimo no puede ser negativo', 400);
  }

  // Si se cambia el precio, registrar movimiento si hay stock
  if (data.price !== undefined && data.price !== product.price && product.stock > 0) {
    await repository.createStockMovement({
      productId: id,
      type: 'adjustment',
      quantity: 0, // movimiento de precio, no de stock
      reason: 'Cambio de precio',
      notes: `Precio anterior: ${product.price}, nuevo precio: ${data.price}`
    });
  }

  return await repository.update(id, organizationId, data);
};

const remove = async (id, organizationId) => {
  const product = await getById(id, organizationId);

  // Verificar si tiene stock
  if (product.stock > 0) {
    throw new AppError('No se puede eliminar un producto con stock disponible', 400);
  }

  return await repository.remove(id, organizationId);
};

const adjustStock = async (id, quantity, reason, organizationId, notes = '') => {
  const product = await getById(id, organizationId);

  const newStock = product.stock + quantity;

  if (newStock < 0) {
    throw new AppError('El ajuste resultaría en stock negativo', 400);
  }

  // Actualizar stock
  await repository.updateStock(id, quantity, organizationId);

  // Registrar movimiento
  await repository.createStockMovement({
    productId: id,
    type: quantity > 0 ? 'in' : 'out',
    quantity,
    reason,
    notes
  });

  return { message: 'Stock ajustado exitosamente', newStock };
};

const getLowStockAlerts = async (organizationId) => {
  const lowStockProducts = await repository.getLowStockProducts(organizationId);

  return lowStockProducts.map(product => ({
    id: product.id,
    name: product.name,
    currentStock: product.stock,
    minStock: product.minStock,
    status: product.stock === 0 ? 'Sin stock' : 'Stock bajo'
  }));
};

const getStockMovements = async (id, organizationId, limit = 50) => {
  await getById(id, organizationId); // Validar que existe

  return await repository.getStockMovements(id, organizationId, limit);
};

const getProductsByCategory = async (category, organizationId) => {
  if (!category) {
    throw new AppError('Categoría es requerida', 400);
  }

  return await repository.getProductsByCategory(category, organizationId);
};

const calculateProfitMargin = async (id, organizationId) => {
  const product = await getById(id, organizationId);

  if (!product.cost) {
    return { profitMargin: null, message: 'No hay costo definido para calcular margen' };
  }

  const profitMargin = ((product.price - product.cost) / product.cost) * 100;

  return {
    productId: product.id,
    name: product.name,
    cost: product.cost,
    price: product.price,
    profit: product.price - product.cost,
    profitMargin: Math.round(profitMargin * 100) / 100 // redondear a 2 decimales
  };
};

const getInventoryValue = async (organizationId) => {
  const products = await repository.findAll(organizationId);

  const inventoryValue = products.reduce((total, product) => {
    return total + (product.stock * product.cost || 0);
  }, 0);

  const retailValue = products.reduce((total, product) => {
    return total + (product.stock * product.price);
  }, 0);

  return {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.isActive).length,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    retailValue: Math.round(retailValue * 100) / 100,
    potentialProfit: Math.round((retailValue - inventoryValue) * 100) / 100
  };
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  adjustStock,
  getLowStockAlerts,
  getStockMovements,
  getProductsByCategory,
  calculateProfitMargin,
  getInventoryValue
};
