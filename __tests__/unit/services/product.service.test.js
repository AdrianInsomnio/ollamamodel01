const { faker } = require('@faker-js/faker/locale/es');
const productService = require('../../../src/modules/products/product.service');
const productRepository = require('../../../src/modules/products/product.repository');
const { AppError } = require('../../../src/core/errors/AppError');

// Mocks
jest.mock('../../../src/modules/products/product.repository');

describe('Product Service', () => {
  let organizationId;
  let mockProduct;

  beforeEach(() => {
    jest.clearAllMocks();

    organizationId = faker.number.int({ min: 1, max: 100 });
    mockProduct = {
      id: faker.number.int(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: faker.number.float({ min: 10, max: 1000 }),
      cost: faker.number.float({ min: 5, max: 500 }),
      stock: faker.number.int({ min: 0, max: 100 }),
      minStock: faker.number.int({ min: 1, max: 10 }),
      category: faker.commerce.department(),
      isActive: true,
      organizationId
    };
  });

  describe('create', () => {
    it('debería crear un producto exitosamente', async () => {
      // Arrange
      const productData = {
        name: mockProduct.name,
        price: mockProduct.price,
        stock: mockProduct.stock
      };
      productRepository.create.mockResolvedValue(mockProduct);

      // Act
      const result = await productService.create(productData, organizationId);

      // Assert
      expect(productRepository.create).toHaveBeenCalledWith(productData, organizationId);
      expect(result).toEqual(mockProduct);
    });

    it('debería lanzar error si falta nombre o precio', async () => {
      // Arrange
      const productData = { price: mockProduct.price };

      // Act & Assert
      await expect(productService.create(productData, organizationId))
        .rejects
        .toThrow(new AppError('Nombre y precio son requeridos', 400));
    });

    it('debería lanzar error si el precio es cero o negativo', async () => {
      // Arrange
      const productData = { name: mockProduct.name, price: -10 };

      // Act & Assert
      await expect(productService.create(productData, organizationId))
        .rejects
        .toThrow(new AppError('El precio debe ser mayor a 0', 400));
    });

    it('debería lanzar error si el stock es negativo', async () => {
      // Arrange
      const productData = {
        name: mockProduct.name,
        price: mockProduct.price,
        stock: -5
      };

      // Act & Assert
      await expect(productService.create(productData, organizationId))
        .rejects
        .toThrow(new AppError('El stock no puede ser negativo', 400));
    });
  });

  describe('getById', () => {
    it('debería retornar un producto por ID', async () => {
      // Arrange
      productRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await productService.getById(mockProduct.id, organizationId);

      // Assert
      expect(productRepository.findById).toHaveBeenCalledWith(mockProduct.id, organizationId);
      expect(result).toEqual(mockProduct);
    });

    it('debería lanzar error si el producto no existe', async () => {
      // Arrange
      productRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(productService.getById(mockProduct.id, organizationId))
        .rejects
        .toThrow(new AppError('Producto no encontrado', 404));
    });
  });

  describe('update', () => {
    it('debería actualizar un producto exitosamente', async () => {
      // Arrange
      const updateData = { price: faker.number.float({ min: 50, max: 200 }) };
      const updatedProduct = { ...mockProduct, ...updateData };
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.update.mockResolvedValue(updatedProduct);

      // Act
      const result = await productService.update(mockProduct.id, organizationId, updateData);

      // Assert
      expect(productRepository.update).toHaveBeenCalledWith(mockProduct.id, organizationId, updateData);
      expect(result).toEqual(updatedProduct);
    });

    it('debería registrar movimiento de stock al cambiar precio', async () => {
      // Arrange
      const newPrice = faker.number.float({ min: 50, max: 200 });
      const updateData = { price: newPrice };
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.update.mockResolvedValue({ ...mockProduct, price: newPrice });
      productRepository.createStockMovement.mockResolvedValue({});

      // Act
      await productService.update(mockProduct.id, organizationId, updateData);

      // Assert
      expect(productRepository.createStockMovement).toHaveBeenCalledWith({
        productId: mockProduct.id,
        type: 'adjustment',
        quantity: 0,
        reason: 'Cambio de precio',
        notes: `Precio anterior: ${mockProduct.price}, nuevo precio: ${newPrice}`
      });
    });

    it('debería lanzar error si el precio es negativo', async () => {
      // Arrange
      const updateData = { price: -100 };
      productRepository.findById.mockResolvedValue(mockProduct);

      // Act & Assert
      await expect(productService.update(mockProduct.id, organizationId, updateData))
        .rejects
        .toThrow(new AppError('El precio debe ser mayor a 0', 400));
    });
  });

  describe('adjustStock', () => {
    it('debería ajustar stock exitosamente con entrada', async () => {
      // Arrange
      const quantity = 10;
      const reason = 'Compra';
      const newStock = mockProduct.stock + quantity;
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.updateStock.mockResolvedValue({});
      productRepository.createStockMovement.mockResolvedValue({});

      // Act
      const result = await productService.adjustStock(mockProduct.id, quantity, reason, organizationId);

      // Assert
      expect(productRepository.updateStock).toHaveBeenCalledWith(mockProduct.id, quantity, organizationId);
      expect(productRepository.createStockMovement).toHaveBeenCalledWith({
        productId: mockProduct.id,
        type: 'in',
        quantity,
        reason,
        notes: ''
      });
      expect(result.newStock).toBe(newStock);
    });

    it('debería ajustar stock exitosamente con salida', async () => {
      // Arrange
      const quantity = -5;
      const reason = 'Ajuste';
      const currentStock = 10;
      const newStock = currentStock + quantity;
      productRepository.findById.mockResolvedValue({ ...mockProduct, stock: currentStock });
      productRepository.updateStock.mockResolvedValue({});
      productRepository.createStockMovement.mockResolvedValue({});

      // Act
      const result = await productService.adjustStock(mockProduct.id, quantity, reason, organizationId);

      // Assert
      expect(productRepository.createStockMovement).toHaveBeenCalledWith({
        productId: mockProduct.id,
        type: 'out',
        quantity,
        reason,
        notes: ''
      });
      expect(result.newStock).toBe(newStock);
    });

    it('debería lanzar error si el ajuste resulta en stock negativo', async () => {
      // Arrange
      const quantity = -100; // Más de lo disponible
      productRepository.findById.mockResolvedValue({ ...mockProduct, stock: 10 });

      // Act & Assert
      await expect(productService.adjustStock(mockProduct.id, quantity, 'Ajuste', organizationId))
        .rejects
        .toThrow(new AppError('El ajuste resultaría en stock negativo', 400));
    });
  });

  describe('getLowStockAlerts', () => {
    it('debería retornar productos con stock bajo', async () => {
      // Arrange
      const lowStockProducts = [
        { ...mockProduct, stock: 2, minStock: 5 },
        { ...mockProduct, id: faker.number.int(), stock: 0, minStock: 3 }
      ];
      productRepository.getLowStockProducts.mockResolvedValue(lowStockProducts);

      // Act
      const result = await productService.getLowStockAlerts(organizationId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('status', 'Stock bajo');
      expect(result[1]).toHaveProperty('status', 'Sin stock');
    });
  });

  describe('calculateProfitMargin', () => {
    it('debería calcular margen de ganancia correctamente', async () => {
      // Arrange
      const productWithCost = { ...mockProduct, cost: 80, price: 100 };
      productRepository.findById.mockResolvedValue(productWithCost);

      // Act
      const result = await productService.calculateProfitMargin(mockProduct.id, organizationId);

      // Assert
      expect(result.profit).toBe(20); // 100 - 80
      expect(result.profitMargin).toBe(25); // (20/80) * 100
    });

    it('debería retornar null si no hay costo definido', async () => {
      // Arrange
      const productWithoutCost = { ...mockProduct, cost: null };
      productRepository.findById.mockResolvedValue(productWithoutCost);

      // Act
      const result = await productService.calculateProfitMargin(mockProduct.id, organizationId);

      // Assert
      expect(result.profitMargin).toBeNull();
      expect(result.message).toContain('No hay costo definido');
    });
  });

  describe('getInventoryValue', () => {
    it('debería calcular el valor total del inventario', async () => {
      // Arrange
      const products = [
        { ...mockProduct, stock: 10, cost: 50, price: 100 },
        { ...mockProduct, id: faker.number.int(), stock: 5, cost: 30, price: 60, isActive: false }
      ];
      productRepository.findAll.mockResolvedValue(products);

      // Act
      const result = await productService.getInventoryValue(organizationId);

      // Assert
      expect(result.totalProducts).toBe(2);
      expect(result.activeProducts).toBe(1);
      expect(result.inventoryValue).toBe(10 * 50 + 5 * 30); // 500 + 150 = 650
      expect(result.retailValue).toBe(10 * 100 + 5 * 60); // 1000 + 300 = 1300
      expect(result.potentialProfit).toBe(1300 - 650); // 650
    });
  });

  describe('remove', () => {
    it('debería eliminar un producto sin stock', async () => {
      // Arrange
      const productWithoutStock = { ...mockProduct, stock: 0 };
      productRepository.findById.mockResolvedValue(productWithoutStock);
      productRepository.remove.mockResolvedValue({});

      // Act
      const result = await productService.remove(mockProduct.id, organizationId);

      // Assert
      expect(productRepository.remove).toHaveBeenCalledWith(mockProduct.id, organizationId);
    });

    it('debería lanzar error si el producto tiene stock', async () => {
      // Arrange
      const productWithStock = { ...mockProduct, stock: 10 };
      productRepository.findById.mockResolvedValue(productWithStock);

      // Act & Assert
      await expect(productService.remove(mockProduct.id, organizationId))
        .rejects
        .toThrow(new AppError('No se puede eliminar un producto con stock disponible', 400));
    });
  });
});