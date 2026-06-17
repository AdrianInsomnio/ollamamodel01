const idempotency = require('../../../src/core/idempotency/idempotency.middleware');
const idempotencyService = require('../../../src/core/idempotency/idempotency.service');
const { AppError } = require('../../../src/core/errors/AppError');

jest.mock('../../../src/core/idempotency/idempotency.service', () => ({
  findReplay: jest.fn(),
  saveResponse: jest.fn(),
}));

const mockService = jest.mocked(idempotencyService);

const makeRes = () => ({
  statusCode: 200,
  headers: {},
  locals: {},
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(k, v) { this.headers[k] = v; return this; },
});

// Helper: ejecuta el middleware y resuelve con { nextCalled, nextErr }.
// El middleware es async, por lo que el callback de next puede dispararse
// varios ticks despues. Esperamos a que eso ocurra.
const runMiddleware = (req, res) => new Promise((resolve) => {
  const mw = idempotency('POST /api/sales');
  let settled = false;
  const settle = (payload) => {
    if (settled) return;
    settled = true;
    resolve(payload);
  };
  const next = (err) => settle({ nextCalled: true, nextErr: err });
  mw(req, res, next);
  // Si el middleware responde directo (cache hit) sin llamar next,
  // el test cliente debe inspeccionar res. Damos margen de un tick.
  setImmediate(() => settle({ nextCalled: false, nextErr: undefined }));
});

describe('idempotency.middleware - factory', () => {
  it('deberia lanzar si no se pasa endpointName', () => {
    expect(() => idempotency()).toThrow(/endpointName/);
    expect(() => idempotency('')).toThrow(/endpointName/);
    expect(() => idempotency(null)).toThrow(/endpointName/);
  });
});

describe('idempotency.middleware - comportamiento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deberia ser no-op si no viene header Idempotency-Key', async () => {
    const req = { headers: {} };
    const res = makeRes();
    const { nextCalled } = await runMiddleware(req, res);
    expect(nextCalled).toBe(true);
    expect(mockService.findReplay).not.toHaveBeenCalled();
  });

  it('deberia rechazar keys demasiado cortas con 400 INVALID_IDEMPOTENCY_KEY', async () => {
    const req = { headers: { 'idempotency-key': 'abc' } };
    const res = makeRes();
    const { nextCalled, nextErr } = await runMiddleware(req, res);
    expect(nextCalled).toBe(true);
    expect(nextErr).toBeInstanceOf(AppError);
    expect(nextErr.statusCode).toBe(400);
    expect(nextErr.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  it('deberia rechazar keys mas largas que 200 chars', async () => {
    const req = { headers: { 'idempotency-key': 'a'.repeat(201) } };
    const res = makeRes();
    const { nextCalled, nextErr } = await runMiddleware(req, res);
    expect(nextCalled).toBe(true);
    expect(nextErr).toBeInstanceOf(AppError);
  });

  it('deberia responder con la respuesta cacheada y header X-Idempotency-Replay en hit', async () => {
    mockService.findReplay.mockResolvedValue({
      hit: true,
      statusCode: 201,
      response: { id: 99, total: 1500 },
    });

    const req = { headers: { 'idempotency-key': 'abc12345-long-enough' } };
    const res = makeRes();
    const { nextCalled } = await runMiddleware(req, res);

    expect(nextCalled).toBe(false); // No se llamo next, respondio directo
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 99, total: 1500 });
    expect(res.headers['X-Idempotency-Replay']).toBe('true');
    expect(res.headers['X-Idempotency-Endpoint']).toBe('POST /api/sales');
  });

  it('deberia llamar next() en cache miss y persistir la respuesta cuando res.json se invoque', async () => {
    mockService.findReplay.mockResolvedValue({ hit: false });
    mockService.saveResponse.mockResolvedValue();

    const req = { headers: { 'idempotency-key': 'fresh-key-12345' } };
    const res = makeRes();

    const { nextCalled, nextErr } = await runMiddleware(req, res);
    expect(nextCalled).toBe(true);
    expect(nextErr).toBeUndefined();
    expect(res.locals.idempotency).toEqual({ key: 'fresh-key-12345', endpoint: 'POST /api/sales' });

    // Ahora simulamos el handler llamando a res.json
    res.statusCode = 201;
    res.json({ id: 1, total: 100 });

    // Damos ticks para que el .catch() del saveResponse se asiente
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(mockService.saveResponse).toHaveBeenCalledWith(
      'fresh-key-12345',
      'POST /api/sales',
      201,
      { id: 1, total: 100 }
    );
  });

  it('deberia continuar (next sin error) si la lectura de cache falla', async () => {
    mockService.findReplay.mockRejectedValue(new Error('db timeout'));

    const req = { headers: { 'idempotency-key': 'another-key-12345' } };
    const res = makeRes();
    const { nextCalled, nextErr } = await runMiddleware(req, res);
    expect(nextCalled).toBe(true);
    expect(nextErr).toBeUndefined();
  });
});
