const { faker } = require('@faker-js/faker/locale/es');
const saleService = require('../../../src/modules/sales/sale.service');
const saleRepository = require('../../../src/modules/sales/sale.repository');
const productRepository = require('../../../src/modules/products/product.repository');
const clientRepository = require('../../../src/modules/clients/client.repository');
const { AppError } = require('../../../src/core/errors/AppError');

// Mocks
jest.mock('../../../src/modules/sales/sale.repository');
jest.mock('../../../src/modules/products/product.repository');
jest.mock('../../../src/modules/clients/client.repository');
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    pet: {
      findFirst: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

const mockSaleRepository = jest.mocked(saleRepository);
const mockProductRepository = jest.mocked(productRepository);
const mockClientRepository = jest.mocked(clientRepository);

describe('Sale Service', () => {
  let organizationId;
  let mockClient;
  let mockProduct;
  let mockSaleData;

  beforeEach(() => {
    jest.clearAllMocks();

    organizationId = faker.number.int({ min: 1, max: 100 });
    mockClient = {
      id: faker.number.int(),
      name: faker.person.fullName(),
      isActive: true
    };

    mockProduct = {
      id: faker.number.int(),
      name: faker.commerce.productName(),
      price: faker.number.float({ min: 10, max: 1000 }),
      stock: faker.number.int({ min: 10, max: 100 }),
      isActive: true,
      organizationId
    };

    mockSaleData = {
      clientId: mockClient.id,
      items: [
        {
          itemType: 'product',
          itemId: mockProduct.id,
          quantity: faker.number.int({ min: 1, max: 5 })
        }
      ],
      paymentMethod: 'cash'
    };
  });

  describe('createSale', () => {
    it('debería crear una venta exitosamente con productos válidos', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct]);
      mockSaleRepository.createWithStockMovements.mockResolvedValue({
        id: faker.number.int(),
        ...mockSaleData,
        subtotal: mockProduct.price * mockSaleData.items[0].quantity,
        tax: (mockProduct.price * mockSaleData.items[0].quantity) * 0.14,
        total: (mockProduct.price * mockSaleData.items[0].quantity) * 1.14,
        items: []
      });

      // Act
      const result = await saleService.createSale(mockSaleData, organizationId);

      // Assert
      expect(mockClientRepository.findById).toHaveBeenCalledWith(mockClient.id, organizationId);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([mockProduct.id], organizationId);
      expect(mockSaleRepository.createWithStockMovements).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debería lanzar error si el cliente no existe', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(saleService.createSale(mockSaleData, organizationId))
        .rejects
        .toThrow(new AppError('Cliente no encontrado', 404));
    });

    it('debería lanzar error si el producto no tiene stock suficiente', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(mockClient);
      const lowStockProduct = { ...mockProduct, stock: 1 };
      mockProductRepository.findByIds.mockResolvedValue([lowStockProduct]);
      const saleDataWithHighQuantity = {
        ...mockSaleData,
        items: [{ ...mockSaleData.items[0], quantity: 10 }]
      };

      // Act & Assert
      await expect(saleService.createSale(saleDataWithHighQuantity, organizationId))
        .rejects
        .toThrow(/Stock insuficiente/);
    });

    it('debería calcular correctamente los totales con IVA', async () => {
      // Arrange
      const quantity = 2;
      const unitPrice = 100;
      const expectedSubtotal = unitPrice * quantity; // 200
      const expectedTax = expectedSubtotal * 0.14; // 28
      const expectedTotal = expectedSubtotal + expectedTax; // 228

      const productWithPrice = { ...mockProduct, price: unitPrice };
      const saleData = {
        ...mockSaleData,
        items: [{ ...mockSaleData.items[0], quantity, itemId: productWithPrice.id }]
      };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([productWithPrice]);
      mockSaleRepository.createWithStockMovements.mockResolvedValue({
        id: faker.number.int(),
        ...saleData,
        subtotal: expectedSubtotal,
        tax: expectedTax,
        total: expectedTotal,
        items: []
      });

      // Act
      const result = await saleService.createSale(saleData, organizationId);

      // Assert
      expect(mockSaleRepository.createWithStockMovements).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: expectedSubtotal,
          tax: expectedTax,
          total: expectedTotal
        }),
        expect.any(Array),
        expect.any(Array),
        organizationId
      );
    });

    it('debería aplicar descuento correctamente', async () => {
      // Arrange
      const discount = 10; // 10%
      const subtotal = 200;
      const discountAmount = subtotal * (discount / 100); // 20
      const taxableAmount = subtotal - discountAmount; // 180
      const tax = taxableAmount * 0.14; // 25.2
      const total = taxableAmount + tax; // 205.2

      const saleDataWithDiscount = { ...mockSaleData, discount };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct]);
      mockSaleRepository.createWithStockMovements.mockResolvedValue({
        id: faker.number.int(),
        ...saleDataWithDiscount,
        subtotal,
        discount: discountAmount,
        tax,
        total,
        items: []
      });

      // Act
      await saleService.createSale(saleDataWithDiscount, organizationId);

      // Assert
      expect(mockSaleRepository.createWithStockMovements).toHaveBeenCalledWith(
        expect.objectContaining({
          discount: discountAmount,
          tax,
          total
        }),
        expect.any(Array),
        expect.any(Array),
        organizationId
      );
    });
  });

  describe('getById', () => {
    it('debería retornar una venta por ID', async () => {
      // Arrange
      const saleId = faker.number.int();
      const mockSale = { id: saleId, clientId: mockClient.id };
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      // Act
      const result = await saleService.getById(saleId, organizationId);

      // Assert
      expect(mockSaleRepository.findById).toHaveBeenCalledWith(saleId, organizationId);
      expect(result).toEqual(mockSale);
    });

    it('debería lanzar error si la venta no existe', async () => {
      // Arrange
      const saleId = faker.number.int();
      mockSaleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(saleService.getById(saleId, organizationId))
        .rejects
        .toThrow(new AppError('Venta no encontrada', 404));
    });
  });

  describe('getSalesByClient', () => {
    it('debería retornar ventas de un cliente', async () => {
      // Arrange
      const clientId = mockClient.id;
      const mockSales = [faker.helpers.multiple(() => ({ id: faker.number.int() }), { count: 3 })];
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockSaleRepository.getSalesByClient.mockResolvedValue(mockSales);

      // Act
      const result = await saleService.getSalesByClient(clientId, organizationId);

      // Assert
      expect(mockClientRepository.findById).toHaveBeenCalledWith(clientId, organizationId);
      expect(mockSaleRepository.getSalesByClient).toHaveBeenCalledWith(clientId, organizationId);
      expect(result).toEqual(mockSales);
    });
  });

  describe('cancelSale', () => {
    it('debería cancelar una venta y revertir stock', async () => {
      // Arrange
      const saleId = faker.number.int();
      const mockSale = {
        id: saleId,
        status: 'completed',
        items: [
          {
            itemType: 'product',
            itemId: mockProduct.id,
            quantity: 2
          }
        ]
      };

      saleRepository.findById.mockResolvedValue(mockSale);

      // Act
      const result = await saleService.cancelSale(saleId, organizationId);

      // Assert
      expect(result).toEqual({ message: 'Venta cancelada exitosamente' });
    });

    it('debería lanzar error si la venta ya está cancelada', async () => {
      // Arrange
      const saleId = faker.number.int();
      const mockSale = { id: saleId, status: 'cancelled' };
      saleRepository.findById.mockResolvedValue(mockSale);

      // Act & Assert
      await expect(saleService.cancelSale(saleId, organizationId))
        .rejects
        .toThrow(new AppError('La venta ya está cancelada', 400));
    });
  });
});