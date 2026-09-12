const { faker } = require('@faker-js/faker/locale/es');
const saleService = require('../../../src/modules/sales/sale.service');
const saleRepository = require('../../../src/modules/sales/sale.repository');
const productRepository = require('../../../src/modules/products/product.repository');
const clientRepository = require('../../../src/modules/clients/client.repository');
const cashRegisterRepository = require('../../../src/modules/cash/register/cashregister.repository');
const { AppError } = require('../../../src/core/errors/AppError');

// Mocks
jest.mock('../../../src/modules/sales/sale.repository');
jest.mock('../../../src/modules/products/product.repository');
jest.mock('../../../src/modules/clients/client.repository');
jest.mock('../../../src/modules/cash/register/cashregister.repository');
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
const mockCashRegisterRepository = jest.mocked(cashRegisterRepository);

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
      const productPrice = 100; // Precio fijo para el test
      const quantity = 2; // Cantidad fija
      const subtotal = productPrice * quantity; // 200
      const discountAmount = subtotal * (discount / 100); // 20
      const taxableAmount = subtotal - discountAmount; // 180
      const tax = taxableAmount * 0.14; // 25.2
      const total = taxableAmount + tax; // 205.2

      // Crear datos específicos para este test
      const testProduct = {
        id: 1,
        name: 'Test Product',
        price: productPrice,
        stock: 10,
        isActive: true,
        organizationId
      };

      const saleDataWithDiscount = {
        clientId: mockClient.id,
        items: [
          {
            itemType: 'product',
            itemId: testProduct.id,
            quantity: quantity
          }
        ],
        paymentMethod: 'cash',
        discount
      };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([testProduct]);
      mockSaleRepository.createWithStockMovements.mockResolvedValue({
        id: 1,
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

  describe('payments and cash shift', () => {
    it('should prepare mixed payments linked to the cash shift', async () => {
      const productWithPrice = { ...mockProduct, price: 100 };
      const saleData = {
        ...mockSaleData,
        cashShiftId: 12,
        userId: 7,
        items: [{ ...mockSaleData.items[0], itemId: productWithPrice.id, quantity: 1 }],
        payments: [
          { method: 'cash', amount: 57 },
          { method: 'DEBIT_CARD', amount: 57 },
        ],
      };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([productWithPrice]);
      mockSaleRepository.createWithStockMovements.mockResolvedValue({ id: 1 });

      await saleService.createSale(saleData, organizationId);

      expect(mockSaleRepository.createWithStockMovements).toHaveBeenCalledWith(
        expect.objectContaining({
          cashShiftId: 12,
          userId: 7,
          paymentMethod: 'CASH',
          payments: [
            expect.objectContaining({ method: 'CASH', amount: 57 }),
            expect.objectContaining({ method: 'DEBIT_CARD', amount: 57 }),
          ],
        }),
        expect.any(Array),
        expect.any(Array),
        organizationId,
      );
    });

    it('should reject payments whose sum does not match the sale total', async () => {
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct]);

      await expect(saleService.createSale({
        ...mockSaleData,
        cashShiftId: 12,
        payments: [{ method: 'cash', amount: 1 }],
      }, organizationId)).rejects.toThrow('La suma de los pagos debe coincidir');

      expect(mockSaleRepository.createWithStockMovements).not.toHaveBeenCalled();
    });

    it('should reject explicit payments without a cash shift', async () => {
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct]);

      await expect(saleService.createSale({
        ...mockSaleData,
        payments: [{ method: 'cash', amount: 100 }],
      }, organizationId)).rejects.toThrow('El turno de caja es obligatorio');
    });
  });

  describe('waiting sales', () => {
    it('guarda una cuenta en espera sin pagos y la asocia al turno abierto', async () => {
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockProductRepository.findByIds.mockResolvedValue([mockProduct]);
      mockCashRegisterRepository.findShiftById.mockResolvedValue({ id: 8, status: 'OPEN' });
      mockSaleRepository.createWaitingSaleAtomic.mockResolvedValue({ id: 44, status: 'WAITING' });

      const result = await saleService.createWaitingSale({ ...mockSaleData, cashShiftId: 8 }, organizationId, 7);

      expect(result).toEqual({ id: 44, status: 'WAITING' });
      expect(mockSaleRepository.createWaitingSaleAtomic).toHaveBeenCalledWith(expect.objectContaining({
        cashShiftId: 8,
        clinicId: organizationId,
        userId: 7,
        saleData: expect.not.objectContaining({ payments: expect.anything(), paymentMethod: expect.anything() }),
      }));
    });

    it('lista y retoma únicamente cuentas del turno abierto', async () => {
      mockCashRegisterRepository.findShiftById.mockResolvedValue({ id: 8, status: 'OPEN' });
      mockSaleRepository.findWaitingSales.mockResolvedValue([{ id: 44, status: 'WAITING' }]);
      mockSaleRepository.resumeWaitingSaleAtomic.mockResolvedValue({ id: 44, status: 'DRAFT' });

      await expect(saleService.getWaitingSales(8, organizationId, 7)).resolves.toEqual([{ id: 44, status: 'WAITING' }]);
      await expect(saleService.resumeWaitingSale(44, organizationId, 7)).resolves.toEqual({ id: 44, status: 'DRAFT' });
      expect(mockSaleRepository.findWaitingSales).toHaveBeenCalledWith(8, organizationId);
      expect(mockSaleRepository.resumeWaitingSaleAtomic).toHaveBeenCalledWith({ id: 44, clinicId: organizationId, userId: 7 });
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

  describe('updateSale', () => {
    it('should reject modifications when the associated shift is closed', async () => {
      const saleId = 44;
      mockSaleRepository.findById.mockResolvedValue({
        id: saleId,
        status: 'completed',
        cashShiftId: 9,
        cashShift: { status: 'CLOSED' },
        client: { name: 'Cliente' },
      });

      await expect(saleService.updateSale(saleId, { items: [] }, organizationId, 7))
        .rejects.toThrow('No puede modificarse este ticket porque el turno ya fue cerrado');
      expect(mockSaleRepository.updateSaleAtomic).not.toHaveBeenCalled();
    });

    it('should calculate a new total and pass the replacement payments atomically', async () => {
      const saleId = 45;
      const productWithPrice = { ...mockProduct, price: 100, stock: 10 };
      mockSaleRepository.findById.mockResolvedValue({
        id: saleId,
        status: 'completed',
        cashShiftId: 9,
        cashShift: { status: 'OPEN' },
        client: { name: 'Cliente' },
      });
      mockProductRepository.findByIds.mockResolvedValue([productWithPrice]);
      mockSaleRepository.updateSaleAtomic.mockResolvedValue({ id: saleId });

      await saleService.updateSale(saleId, {
        items: [{ itemType: 'product', itemId: productWithPrice.id, quantity: 1 }],
        payments: [{ method: 'cash', amount: 114 }],
        discount: 0,
      }, organizationId, 7);

      expect(mockSaleRepository.updateSaleAtomic).toHaveBeenCalledWith(expect.objectContaining({
        id: saleId,
        userId: 7,
        payments: [expect.objectContaining({ method: 'CASH', amount: 114 })],
        saleData: expect.objectContaining({ total: 114 }),
      }));
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
      mockSaleRepository.cancelSaleAtomic.mockResolvedValue({ message: 'Venta cancelada exitosamente' });

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
      mockSaleRepository.cancelSaleAtomic.mockRejectedValue(new AppError('La venta ya está cancelada', 400));

      // Act & Assert
      await expect(saleService.cancelSale(saleId, organizationId))
        .rejects
        .toThrow(new AppError('La venta ya está cancelada', 400));
    });
  });

  describe('printSale', () => {
    it('should register the original print without changing the sale', async () => {
      const sale = {
        id: 80,
        subtotal: 100,
        discount: 0,
        tax: 14,
        total: 114,
        paymentMethod: 'CASH',
        client: { id: 1, name: 'Cliente' },
        pet: null,
        saleItems: [{ nameSnapshot: 'Producto', quantity: 1, priceSnapshot: 100, subtotal: 100 }],
        payments: [{ method: 'CASH', amount: 114 }],
      };
      mockSaleRepository.createTicketPrintAtomic.mockResolvedValue({
        sale,
        print: { id: 1, type: 'ORIGINAL', reprintNumber: 0 },
      });

      const result = await saleService.printSale(80, organizationId, 7);

      expect(mockSaleRepository.createTicketPrintAtomic).toHaveBeenCalledWith({
        saleId: 80,
        clinicId: organizationId,
        userId: 7,
        reason: undefined,
      });
      expect(result.printData.type).toBe('TICKET ORIGINAL');
      expect(result.printData.payments).toEqual([{ method: 'CASH', amount: 114 }]);
    });

    it('should label subsequent prints as duplicate', async () => {
      mockSaleRepository.createTicketPrintAtomic.mockResolvedValue({
        sale: { id: 81, saleItems: [], payments: [], total: 0 },
        print: { id: 2, type: 'DUPLICATE', reprintNumber: 1 },
      });

      const result = await saleService.printSale(81, organizationId, 7, 'Cliente solicita copia');

      expect(result.printData.type).toBe('TICKET DUPLICADO');
      expect(result.printData.reprintNumber).toBe(1);
    });
  });
});
