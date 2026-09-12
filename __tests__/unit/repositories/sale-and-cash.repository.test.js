const { prisma } = require('../../../src/lib/prisma');
const saleRepository = require('../../../src/modules/sales/sale.repository');
const cashRepository = require('../../../src/modules/cash/register/cashregister.repository');

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe('POS waiting sales and cash closing invariants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates WAITING without payment data and preserves the clinic boundary', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      cashShift: {
        findFirst: jest.fn().mockResolvedValue({ id: 8, clinicId: 10, userId: 7, status: 'OPEN', cashRegisterId: 3 }),
      },
      sale: {
        create: jest.fn().mockResolvedValue({ id: 44, status: 'WAITING', total: 100 }),
      },
      cashAuditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await saleRepository.createWaitingSaleAtomic({
      saleData: { clientId: 20, total: 100 },
      items: [{ itemType: 'product', itemId: 5, quantity: 1 }],
      clinicId: 10,
      userId: 7,
      cashShiftId: 8,
    });

    expect(tx.cashShift.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8, clinicId: 10, userId: 7, status: 'OPEN' },
    }));
    expect(tx.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clinicId: 10,
        cashShiftId: 8,
        userId: 7,
        status: 'WAITING',
        paymentMethod: null,
      }),
    }));
    expect(tx.sale.create.mock.calls[0][0].data).not.toHaveProperty('payments');
    expect(tx.cashAuditEvent.create).toHaveBeenCalled();
  });

  it('does not resume a waiting sale across clinics', async () => {
    const tx = {
      sale: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(saleRepository.resumeWaitingSaleAtomic({ id: 44, clinicId: 99, userId: 7 }))
      .rejects.toMatchObject({ statusCode: 404, code: 'WAITING_ACCOUNT_NOT_FOUND' });

    expect(tx.sale.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 44, clinicId: 99, status: { in: ['WAITING', 'HELD'] } },
    }));
  });

  it('does not resume a waiting sale owned by another cash-shift user', async () => {
    const tx = {
      sale: {
        findFirst: jest.fn().mockResolvedValue({
          id: 44,
          clinicId: 10,
          status: 'WAITING',
          cashShiftId: 8,
          cashShift: { status: 'OPEN', userId: 99, cashRegisterId: 3 },
        }),
      },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(saleRepository.resumeWaitingSaleAtomic({ id: 44, clinicId: 10, userId: 7 }))
      .rejects.toMatchObject({ statusCode: 403, code: 'CASH_SHIFT_ACCESS_DENIED' });
  });

  it('blocks closing a shift with WAITING sales', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      cashShift: { findFirst: jest.fn().mockResolvedValue({ id: 8, clinicId: 10, status: 'OPEN', openingAmount: 100 }) },
      sale: { count: jest.fn().mockResolvedValue(1) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(cashRepository.closeShiftAtomic({
      id: 8,
      clinicId: 10,
      userId: 7,
      countedAmount: 100,
    })).rejects.toMatchObject({ statusCode: 400, code: 'WAITING_SALES_PENDING' });

    expect(tx.sale.count).toHaveBeenCalledWith({
      where: { clinicId: 10, cashShiftId: 8, status: { in: ['WAITING', 'HELD'] } },
    });
  });

  it('allows closing a shift when only DRAFT work exists', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      cashShift: {
        findFirst: jest.fn().mockResolvedValue({ id: 8, clinicId: 10, status: 'OPEN', openingAmount: 100 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: 8, status: 'CLOSED' }),
      },
      sale: { count: jest.fn().mockResolvedValue(0) },
      cashMovement: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(cashRepository.closeShiftAtomic({
      id: 8,
      clinicId: 10,
      userId: 7,
      countedAmount: 100,
    })).resolves.toEqual({ id: 8, status: 'CLOSED' });

    expect(tx.cashShift.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8, clinicId: 10, status: 'OPEN' },
    }));
  });
});
