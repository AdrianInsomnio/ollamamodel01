const { faker } = require('@faker-js/faker');
const idempotencyService = require('../../../src/core/idempotency/idempotency.service');
const { prisma } = require('../../../src/lib/prisma');

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    idempotencyKey: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = jest.mocked(prisma);

describe('idempotency.service - findReplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deberia devolver hit=false si no se pasa key', async () => {
    const result = await idempotencyService.findReplay(null, 'POST /api/sales');
    expect(result).toEqual({ hit: false });
    expect(mockPrisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
  });

  it('deberia devolver hit=false si no se pasa endpoint', async () => {
    const result = await idempotencyService.findReplay('some-key', null);
    expect(result).toEqual({ hit: false });
  });

  it('deberia devolver hit=false si no existe la fila', async () => {
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);
    const result = await idempotencyService.findReplay('k-1', 'POST /api/sales');
    expect(result).toEqual({ hit: false });
  });

  it('deberia devolver hit=true con statusCode y response si existe y no expiro', async () => {
    const createdAt = new Date(Date.now() - 60 * 1000); // 1 min atras
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'k-1',
      endpoint: 'POST /api/sales',
      statusCode: 201,
      response: { id: 42, total: 999 },
      createdAt,
    });

    const result = await idempotencyService.findReplay('k-1', 'POST /api/sales');
    expect(result).toEqual({
      hit: true,
      statusCode: 201,
      response: { id: 42, total: 999 },
    });
  });

  it('deberia borrar la fila expirada y devolver hit=false', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h atras
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'k-2',
      endpoint: 'POST /api/sales',
      statusCode: 201,
      response: { id: 1 },
      createdAt: oldDate,
    });
    mockPrisma.idempotencyKey.delete.mockResolvedValue({});

    const result = await idempotencyService.findReplay('k-2', 'POST /api/sales');
    expect(result).toEqual({ hit: false });
    expect(mockPrisma.idempotencyKey.delete).toHaveBeenCalledWith({
      where: { key_endpoint: { key: 'k-2', endpoint: 'POST /api/sales' } },
    });
  });

  it('deberia tolerar fallos en el delete de expirados (best-effort)', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      key: 'k-3', endpoint: 'e', statusCode: 200, response: {}, createdAt: oldDate,
    });
    mockPrisma.idempotencyKey.delete.mockRejectedValue(new Error('db down'));

    const result = await idempotencyService.findReplay('k-3', 'e');
    expect(result).toEqual({ hit: false });
  });
});

describe('idempotency.service - saveResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no deberia persistir si no hay key', async () => {
    await idempotencyService.saveResponse(null, 'e', 200, { ok: true });
    expect(mockPrisma.idempotencyKey.upsert).not.toHaveBeenCalled();
  });

  it('no deberia persistir si no hay endpoint', async () => {
    await idempotencyService.saveResponse('k', null, 200, { ok: true });
    expect(mockPrisma.idempotencyKey.upsert).not.toHaveBeenCalled();
  });

  it('no deberia persistir respuestas 4xx', async () => {
    await idempotencyService.saveResponse('k', 'e', 400, { error: 'bad' });
    await idempotencyService.saveResponse('k', 'e', 422, { error: 'bad' });
    expect(mockPrisma.idempotencyKey.upsert).not.toHaveBeenCalled();
  });

  it('no deberia persistir respuestas 5xx', async () => {
    await idempotencyService.saveResponse('k', 'e', 500, { error: 'oops' });
    expect(mockPrisma.idempotencyKey.upsert).not.toHaveBeenCalled();
  });

  it('deberia persistir respuestas 2xx con upsert', async () => {
    mockPrisma.idempotencyKey.upsert.mockResolvedValue({});
    const body = { id: faker.number.int(), total: 500 };
    await idempotencyService.saveResponse('k-ok', 'POST /api/sales', 201, body);
    expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith({
      where: { key_endpoint: { key: 'k-ok', endpoint: 'POST /api/sales' } },
      create: { key: 'k-ok', endpoint: 'POST /api/sales', statusCode: 201, response: body },
      update: { statusCode: 201, response: body },
    });
  });

  it('deberia tolerar errores del upsert (best-effort)', async () => {
    mockPrisma.idempotencyKey.upsert.mockRejectedValue(new Error('unique'));
    await expect(
      idempotencyService.saveResponse('k', 'e', 200, { ok: true })
    ).resolves.toBeUndefined();
  });
});

describe('idempotency.service - isExpired', () => {
  it('deberia devolver true si la edad supera el TTL (default 24h)', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(idempotencyService.isExpired(old)).toBe(true);
  });

  it('deberia devolver false si la edad es menor al TTL', () => {
    const recent = new Date(Date.now() - 60 * 1000);
    expect(idempotencyService.isExpired(recent)).toBe(false);
  });
});
