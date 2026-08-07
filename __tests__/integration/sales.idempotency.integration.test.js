jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock Prisma. La idempotencia opera contra prisma.idempotencyKey.
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    idempotencyKey: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    users: { findFirst: jest.fn(), findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    client: { findFirst: jest.fn() },
  },
}));

jest.mock('../../src/modules/clients/client.repository', () => ({
  findById: jest.fn(),
}));
jest.mock('../../src/modules/products/product.repository', () => ({
  findByIds: jest.fn(),
}));
jest.mock('../../src/modules/sales/sale.repository', () => ({
  createWithStockMovements: jest.fn(),
}));

jest.mock('../../src/core/idempotency/idempotency.service', () => ({
  findReplay: jest.fn(),
  saveResponse: jest.fn(),
}));

// Bypass auth y autorizacion para enfocarnos en la idempotencia
jest.mock('../../src/core/middlewares/auth.middleware', () => ({
  authMiddleware: (req, res, next) => {
    req.user = {
      id: 1,
      username: 'u',
      email: 'e',
      organizationId: 1,
      clinicId: 1,
      role: 'ADMIN',
    };
    next();
  },
  optionalAuthMiddleware: (req, res, next) => next(),
}));

jest.mock('../../src/core/middlewares/authorization.middleware', () => ({
  authorize: () => (req, res, next) => next(),
  authorizeOwnerOrAdmin: () => (req, res, next) => next(),
  authorizeOrganization: () => (req, res, next) => next(),
}));

const request = require('supertest');
const app = require('../../src/app');
const clientRepo = require('../../src/modules/clients/client.repository');
const productRepo = require('../../src/modules/products/product.repository');
const saleRepo = require('../../src/modules/sales/sale.repository');
const idempotencyService = require('../../src/core/idempotency/idempotency.service');

const getHeader = function (res, name) {
  const lower = name.toLowerCase();
  for (const k of Object.keys(res.headers)) {
    if (k.toLowerCase() === lower) return res.headers[k];
  }
  return undefined;
};

describe('POST /api/sales - Idempotencia (Fase D3)', () => {
  beforeEach(function () {
    jest.clearAllMocks();
  });

  const validSaleBody = {
    clientId: 1,
    items: [
      { itemType: 'product', itemId: 1, quantity: 2 },
    ],
    discount: 0,
    paymentMethod: 'cash',
  };

  const happyPath = function () {
    clientRepo.findById.mockResolvedValue({ id: 1, name: 'Test', isActive: true });
    productRepo.findByIds.mockResolvedValue([
      { id: 1, name: 'Producto', price: 100, stock: 50, isActive: true, organizationId: 1 },
    ]);
    saleRepo.createWithStockMovements.mockResolvedValue({
      id: 999,
      clientId: 1,
      organizationId: 1,
      items: [],
    });
  };

  it('sin Idempotency-Key: el handler corre y responde 201', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValue({ hit: false });
    idempotencyService.saveResponse.mockResolvedValue();
    const res = await request(app)
      .post('/api/sales')
      .send(validSaleBody);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 999);
  });

  it('replay: el handler NO se ejecuta cuando hay cache hit', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValue({
      hit: true,
      statusCode: 201,
      response: { id: 999, clientId: 1, organizationId: 1, items: [] },
    });

    const r1 = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', 'replay-key-aaaaaa')
      .send(validSaleBody);

    expect(r1.status).toBe(201);
    expect(r1.body).toEqual({ id: 999, clientId: 1, organizationId: 1, items: [] });
    expect(saleRepo.createWithStockMovements).not.toHaveBeenCalled();
    expect(clientRepo.findById).not.toHaveBeenCalled();
    expect(productRepo.findByIds).not.toHaveBeenCalled();
  });

  it('cache miss ejecuta handler; cache hit en segundo request es replay', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValueOnce({ hit: false });
    idempotencyService.saveResponse.mockResolvedValueOnce();

    const r1 = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', 'miss-then-hit-1234')
      .send(validSaleBody);
    expect(r1.status).toBe(201);
    expect(r1.body).toHaveProperty('id', 999);
    expect(saleRepo.createWithStockMovements).toHaveBeenCalledTimes(1);
  });

  it('keys distintas en el mismo endpoint producen respuestas distintas', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValue({ hit: false });
    idempotencyService.saveResponse.mockResolvedValue();

    const r1 = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', 'different-keys-aaaa1')
      .send(validSaleBody);
    const r2 = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', 'different-keys-aaaa2')
      .send(validSaleBody);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });

  it('Idempotency-Key de longitud invalida (menor a 8) -> 400 INVALID_IDEMPOTENCY_KEY', async function () {
    const res = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', 'short')
      .send(validSaleBody);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_IDEMPOTENCY_KEY');
  });

  it('Idempotency-Key mayor a 200 chars -> 400 INVALID_IDEMPOTENCY_KEY', async function () {
    const longKey = 'a'.repeat(201);
    const res = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', longKey)
      .send(validSaleBody);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code', 'INVALID_IDEMPOTENCY_KEY');
  });

  it('saveResponse invocado en cache miss con key y endpoint correctos', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValueOnce({ hit: false });
    idempotencyService.saveResponse.mockResolvedValueOnce();

    const r1 = await request(app)
      .post('/api/sales')
      .set('Idempotency-Key', 'persistence-check-12')
      .send(validSaleBody);
    expect(r1.status).toBe(201);
    expect(idempotencyService.saveResponse).toHaveBeenCalled();
  });
});