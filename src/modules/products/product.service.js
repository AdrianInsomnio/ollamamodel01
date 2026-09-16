const repository = require('./product.repository');
const { AppError } = require('../../core/errors/AppError');

const create = async (data, clinicId, role = 'ADMIN') => {
  // Validar datos requeridos
  if (!data.name || data.price === undefined || data.price === null) {
    throw new AppError('Nombre y precio son requeridos', 400);
  }

  const priceType = data.priceType ?? (Number(data.price) === 0 ? 'VARIABLE' : 'FIXED');
  if (data.ivaIncluded !== undefined && typeof data.ivaIncluded !== 'boolean') {
    throw new AppError('La configuración de IVA debe ser booleana', 400, 'INVALID_IVA_INCLUDED');
  }
  if (!['FIXED', 'VARIABLE'].includes(priceType)) {
    throw new AppError('El tipo de precio no es válido', 400, 'INVALID_PRICE_TYPE');
  }
  const isVariableProduct = priceType === 'VARIABLE';
  if (isVariableProduct && Number(data.price) !== 0) {
    throw new AppError('Los productos variables deben tener precio base 0', 400, 'VARIABLE_PRICE_MUST_BE_ZERO');
  }
  if (!isVariableProduct && Number(data.price) <= 0) {
    throw new AppError('El precio debe ser mayor a 0', 400);
  }
  if (role === 'USER' && !isVariableProduct) {
    throw new AppError('USER solo puede crear productos variables con precio 0', 403, 'VARIABLE_PRODUCT_ONLY');
  }

  if (data.price < 0) {
    throw new AppError('El precio debe ser mayor a 0', 400);
  }

  const normalizedData = role === 'USER'
    ? { ...data, price: 0, priceType: 'VARIABLE', cost: null, stock: 0 }
    : (data.priceType || isVariableProduct ? { ...data, priceType } : data);

  if (normalizedData.cost !== undefined && normalizedData.cost !== null && normalizedData.cost < 0) {
    throw new AppError('El costo no puede ser negativo', 400);
  }

  if (normalizedData.stock < 0) {
    throw new AppError('El stock no puede ser negativo', 400);
  }

  if (normalizedData.minStock < 0) {
    throw new AppError('El stock mínimo no puede ser negativo', 400);
  }

  if (normalizedData.categoryId !== undefined && normalizedData.categoryId !== null) {
    const category = await repository.findCategory(normalizedData.categoryId, clinicId);
    if (!category) throw new AppError('Categoría no encontrada para la clínica activa', 400);
  }

  if (normalizedData.subcategoryId !== undefined && normalizedData.subcategoryId !== null) {
    if (normalizedData.categoryId === undefined || normalizedData.categoryId === null) {
      throw new AppError('La subcategoría requiere una categoría activa', 400, 'SUBCATEGORY_CATEGORY_REQUIRED');
    }
    const subcategory = await repository.findSubcategory(normalizedData.subcategoryId, normalizedData.categoryId, clinicId);
    if (!subcategory) throw new AppError('Subcategoría no encontrada para la categoría activa', 400, 'SUBCATEGORY_NOT_FOUND');
  }

  if (normalizedData.maxStock !== undefined && normalizedData.maxStock !== null && normalizedData.maxStock < normalizedData.minStock) {
    throw new AppError('El stock máximo no puede ser menor al stock mínimo', 400, 'INVALID_MAX_STOCK');
  }

  return await repository.create(normalizedData, clinicId);
};

const getAll = async (clinicId) => {
  return await repository.findAll(clinicId);
};

const getById = async (id, clinicId) => {
  const product = await repository.findById(id, clinicId);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }
  return product;
};

const update = async (id, clinicId, data) => {
  const product = await getById(id, clinicId);
  const editableFields = [
    'name', 'description', 'sku', 'barcode', 'brand', 'supplier',
    'categoryId', 'subcategoryId', 'priceType', 'price', 'ivaIncluded',
    'cost', 'stock', 'minStock', 'maxStock', 'isActive', 'discontinuedAt',
  ];
  const updateData = Object.fromEntries(
    editableFields
      .filter((field) => Object.prototype.hasOwnProperty.call(data || {}, field))
      .map((field) => [field, data[field]])
  );

  if (data.ivaIncluded !== undefined && typeof data.ivaIncluded !== 'boolean') {
    throw new AppError('La configuración de IVA debe ser booleana', 400, 'INVALID_IVA_INCLUDED');
  }

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const category = await repository.findCategory(data.categoryId, clinicId);
    if (!category) throw new AppError('Categoría no encontrada para la clínica activa', 400);
  }

  if (data.subcategoryId !== undefined && data.subcategoryId !== null) {
    const categoryId = data.categoryId ?? product.categoryId;
    if (categoryId === undefined || categoryId === null) throw new AppError('La subcategoría requiere una categoría activa', 400, 'SUBCATEGORY_CATEGORY_REQUIRED');
    const subcategory = await repository.findSubcategory(data.subcategoryId, categoryId, clinicId);
    if (!subcategory) throw new AppError('Subcategoría no encontrada para la categoría activa', 400, 'SUBCATEGORY_NOT_FOUND');
  }

  // Validaciones
  const nextPriceType = data.priceType ?? product.priceType ?? (Number(data.price ?? product.price) === 0 ? 'VARIABLE' : 'FIXED');
  if (!['FIXED', 'VARIABLE'].includes(nextPriceType)) throw new AppError('El tipo de precio no es válido', 400, 'INVALID_PRICE_TYPE');
  if (nextPriceType === 'VARIABLE' && data.price !== undefined && Number(data.price) !== 0) throw new AppError('Los productos variables deben tener precio base 0', 400, 'VARIABLE_PRICE_MUST_BE_ZERO');
  if (nextPriceType === 'FIXED' && data.price !== undefined && data.price <= 0) {
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

  if (data.maxStock !== undefined && data.maxStock !== null && data.maxStock < (data.minStock ?? product.minStock)) {
    throw new AppError('El stock máximo no puede ser menor al stock mínimo', 400, 'INVALID_MAX_STOCK');
  }

  // Si se cambia el precio, registrar movimiento si hay stock
  if (data.price !== undefined && data.price !== product.price && product.stock > 0) {
    await repository.createStockMovement({
      productId: id,
      clinicId,
      type: 'adjustment',
      quantity: 0, // movimiento de precio, no de stock
      reason: 'Cambio de precio',
      notes: `Precio anterior: ${product.price}, nuevo precio: ${data.price}`
    });
  }

  return await repository.update(id, clinicId, updateData);
};

const remove = async (id, clinicId) => {
  const product = await getById(id, clinicId);

  // Verificar si tiene stock
  if (product.stock > 0) {
    throw new AppError('No se puede eliminar un producto con stock disponible', 400);
  }

  return await repository.remove(id, clinicId);
};

const adjustStock = async (id, quantity, reason, clinicId, notes = '') => {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new AppError('La cantidad debe ser un entero distinto de cero', 400, 'INVALID_STOCK_QUANTITY');
  }

  if (!reason || !reason.trim()) {
    throw new AppError('El motivo del ajuste es obligatorio', 400, 'STOCK_REASON_REQUIRED');
  }

  const atomicResult = await repository.adjustStockAtomic({ id, quantity, reason: reason.trim(), clinicId, notes });
  if (atomicResult !== undefined) return atomicResult;

  // Compatibilidad con repositorios antiguos durante la transición.
  const product = await getById(id, clinicId);
  const newStock = product.stock + quantity;
  if (newStock < 0) throw new AppError('El ajuste resultaría en stock negativo', 400);
  await repository.updateStock(id, quantity, clinicId);
  await repository.createStockMovement({
    productId: id,
    clinicId,
    type: quantity > 0 ? 'in' : 'out',
    quantity,
    reason: reason.trim(),
    notes,
  });
  return { message: 'Stock ajustado exitosamente', newStock };
};

const getLowStockAlerts = async (clinicId) => {
  const lowStockProducts = await repository.getLowStockProducts(clinicId);

  return lowStockProducts.map(product => ({
    id: product.id,
    name: product.name,
    currentStock: product.stock,
    minStock: product.minStock,
    status: product.stock === 0 ? 'Sin stock' : 'Stock bajo'
  }));
};

const getStockMovements = async (id, clinicId, limit = 50) => {
  await getById(id, clinicId); // Validar que existe

  return await repository.getStockMovements(id, clinicId, limit);
};

const getProductsByCategory = async (category, clinicId) => {
  if (!category) {
    throw new AppError('Categoría es requerida', 400);
  }

  return await repository.getProductsByCategory(category, clinicId);
};

const calculateProfitMargin = async (id, clinicId) => {
  const product = await getById(id, clinicId);

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

const getInventoryValue = async (clinicId) => {
  const products = await repository.findAll(clinicId);

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
