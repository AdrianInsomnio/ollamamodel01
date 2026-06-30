jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock Prisma. La idempotencia opera contra prisma.idempotencyKey.
// Mantenemos un Map global (__idempStore) para que las llamadas entre
// requests consecutivos (jest) compartan estado.
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    idempotencyKey: {
      findUnique: jest.fn(async ({ where: { key_endpoint: ke } }) => {
        return global.__idempStore && global.__idempStore.get(ke.key + '::' + ke.endpoint) || null;
      }),
      upsert: jest.fn(async ({ where: { key_endpoint: ke }, create, update }) => {
        if (!global.__idempStore) global.__idempStore = new Map();
        const k = ke.key + '::' + ke.endpoint;
        const existing = global.__idempStore.get(k);
        const merged = Object.assign({}, existing || {}, existing ? update : create);
        global.__idempStore.set(k, merged);
        return merged;
      }),
      delete: jest.fn(async ({ where: { key_endpoint: ke } }) => {
        if (global.__idempStore) global.__idempStore.delete(ke.key + '::' + ke.endpoint);
        return {};
      }),
    },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
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

// Mock directo del servicio de idempotencia para forzar el camino de
// replay de manera explicita. Esto evita depender de la persistencia
// async y del orden de imports (el problema que teniamos era que el
// findUnique mockeado se ejecutaba pero la respuesta del middleware
// no llegaba al cliente).
jest.mock('../../src/core/idempotency/idempotency.service', () => ({
  findReplay: jest.fn(),
  saveResponse: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const clientRepo = require('../../src/modules/clients/client.repository');
const productRepo = require('../../src/modules/products/product.repository');
const saleRepo = require('../../src/modules/sales/sale.repository');
const idempotencyService = require('../../src/core/idempotency/idempotency.service');

const makeToken = function () {
  return 'Bearer ' + jwt.sign(
    { id: 1, username: 'u', email: 'e', organizationId: 1, role: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

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
      .set('Authorization', makeToken())
      .send(validSaleBody);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 999);
  });

  it('replay: el handler NO se ejecuta cuando hay cache hit', async function () {
    happyPath();
    // Forzar cache hit con una respuesta simple.
    idempotencyService.findReplay.mockResolvedValue({
      hit: true,
      statusCode: 201,
      response: { id: 999, clientId: 1, organizationId: 1, items: [] },
    });

    const r1 = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
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
    // Primer request: cache miss.
    idempotencyService.findReplay.mockResolvedValueOnce({ hit: false });
    idempotencyService.saveResponse.mockResolvedValueOnce();

    const r1 = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'miss-then-hit-1234')
      .send(validSaleBody);
    expect(r1.status).toBe(201);
    expect(r1.body).toHaveProperty('id', 999);
    expect(saleRepo.createWithStockMovements).toHaveBeenCalledTimes(1);

    // Segundo request: cache hit.
    idempotencyService.findReplay.mockResolvedValueOnce({
      hit: true,
      statusCode: 201,
      response: r1.body,
    });
    saleRepo.createWithStockMovements.mockClear();
    productRepo.findByIds.mockClear();
    clientRepo.findById.mockClear();

    const r2 = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'miss-then-hit-1234')
      .send(validSaleBody);
    expect(r2.status).toBe(201);
    expect(r2.body).toEqual(r1.body);
    expect(saleRepo.createWithStockMovements).not.toHaveBeenCalled();
  });

  it('keys distintas en el mismo endpoint producen respuestas distintas', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValue({ hit: false });
    idempotencyService.saveResponse.mockResolvedValue();
    const r1 = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'key-uno-aaaa-bbbb')
      .send(validSaleBody);
    expect(r1.status).toBe(201);
    expect(r1.body).toHaveProperty('id', 999);

    saleRepo.createWithStockMovements.mockResolvedValueOnce({
      id: 1000, clientId: 1, organizationId: 1, items: [],
    });

    const r2 = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'key-dos-cccc-dddd')
      .send(validSaleBody);
    expect(r2.status).toBe(201);
    expect(r2.body).toHaveProperty('id', 1000);
  });

  it('Idempotency-Key de longitud invalida (menor a 8) -> 400 INVALID_IDEMPOTENCY_KEY', async function () {
    const r = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'corto')
      .send(validSaleBody);

    expect(r.status).toBe(400);
    expect(r.body).toHaveProperty('code', 'INVALID_IDEMPOTENCY_KEY');
    expect(saleRepo.createWithStockMovements).not.toHaveBeenCalled();
  });

  it('Idempotency-Key mayor a 200 chars -> 400 INVALID_IDEMPOTENCY_KEY', async function () {
    const r = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'x'.repeat(201))
      .send(validSaleBody);

    expect(r.status).toBe(400);
    expect(r.body).toHaveProperty('code', 'INVALID_IDEMPOTENCY_KEY');
  });

  it('saveResponse invocado en cache miss con key y endpoint correctos', async function () {
    happyPath();
    idempotencyService.findReplay.mockResolvedValue({ hit: false });
    idempotencyService.saveResponse.mockResolvedValue();

    const r1 = await request(app)
      .post('/api/sales')
      .set('Authorization', makeToken())
      .set('Idempotency-Key', 'persistence-check-12')
      .send(validSaleBody);
    expect(r1.status).toBe(201);

    expect(idempotencyService.saveResponse).toHaveBeenCalled();
    const saveArgs = idempotencyService.saveResponse.mock.calls[0];
    expect(saveArgs[0]).toBe('persistence-check-12');
    expect(saveArgs[1]).toBe('POST /api/sales');
    expect(saveArgs[2]).toBe(201);
  });
});
