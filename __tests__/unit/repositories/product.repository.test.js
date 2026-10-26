jest.mock('../../../src/lib/prisma', () => ({ prisma: { $transaction: jest.fn() } }));

const { prisma } = require('../../../src/lib/prisma');
const repository = require('../../../src/modules/products/product.repository');

describe('Product repository initial stock movement', () => {
  const product = { id: 45, stock: 6 };
  const tx = {
    product: { create: jest.fn() },
    stockMovement: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((operation) => operation(tx));
    tx.product.create.mockResolvedValue(product);
    tx.stockMovement.create.mockResolvedValue({ id: 101 });
  });

  it('creates one attributed initial movement in the same transaction', async () => {
    await repository.create({ name: 'Medicamento', stock: 6 }, 7, 9);

    expect(tx.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Medicamento', stock: 6, clinicId: 7 } }));
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: {
      productId: 45,
      clinicId: 7,
      userId: 9,
      type: 'in',
      quantity: 6,
      reason: 'Stock inicial',
      referenceType: 'product',
      referenceId: 45,
    } });
  });

  it('does not create an initial movement when stock is zero', async () => {
    tx.product.create.mockResolvedValueOnce({ ...product, stock: 0 });

    await repository.create({ name: 'Accesorio', stock: 0 }, 7, 9);

    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });
});
