const env = require('../../../src/config/env');
const jwt = require('../../../src/core/utils/jwt.util');
const { authMiddleware, optionalAuthMiddleware } = require('../../../src/core/middlewares/auth.middleware');

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
};

describe('auth.middleware', () => {
  const originalViaCookie = env.env.authViaCookie;

  describe('modo legacy (viaCookie=false)', () => {
    beforeAll(() => { env.env.authViaCookie = false; });
    afterAll(() => { env.env.authViaCookie = originalViaCookie; });

    it('deberia autenticar con Authorization Bearer', () => {
      const token = jwt.generateToken({ id: 1, username: 'u', email: 'e', organizationId: 1, role: 'ADMIN' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = makeRes();
      let nextCalled = false;
      authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(1);
    });

    it('deberia rechazar si no hay header', () => {
      const req = { headers: {} };
      const res = makeRes();
      let nextCalled = false;
      authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it('deberia rechazar si el token es invalido', () => {
      const req = { headers: { authorization: 'Bearer invalido' } };
      const res = makeRes();
      authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });
  });

  describe('modo cookie (viaCookie=true)', () => {
    beforeAll(() => { env.env.authViaCookie = true; });
    afterAll(() => { env.env.authViaCookie = originalViaCookie; });

    it('deberia autenticar leyendo el cookie', () => {
      const token = jwt.generateToken({ id: 2, username: 'u2', email: 'e2', organizationId: 1, role: 'VET' });
      const req = { headers: { cookie: `${env.env.authCookieName}=${token}` } };
      const res = makeRes();
      let nextCalled = false;
      authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(2);
      expect(req.user.role).toBe('VET');
    });

    it('deberia autenticar con cookie aunque venga Authorization header', () => {
      const token = jwt.generateToken({ id: 3, username: 'u3', email: 'e3', organizationId: 1, role: 'ADMIN' });
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
          cookie: `${env.env.authCookieName}=${token}`,
        },
      };
      const res = makeRes();
      let nextCalled = false;
      authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });

    it('deberia rechazar si la cookie no esta presente', () => {
      const req = { headers: { cookie: 'session=other' } };
      const res = makeRes();
      authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });

    it('deberia rechazar si la cookie esta pero el token es invalido', () => {
      const req = { headers: { cookie: `${env.env.authCookieName}=basura` } };
      const res = makeRes();
      authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('deberia continuar sin error si no hay credenciales', () => {
      env.env.authViaCookie = false;
      const req = { headers: {} };
      const res = makeRes();
      let nextCalled = false;
      optionalAuthMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user).toBeUndefined();
    });

    it('deberia autenticar si el header es valido', () => {
      env.env.authViaCookie = false;
      const token = jwt.generateToken({ id: 5, username: 'u5', email: 'e5', organizationId: 1, role: 'USER' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = makeRes();
      let nextCalled = false;
      optionalAuthMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(5);
    });
  });
});
