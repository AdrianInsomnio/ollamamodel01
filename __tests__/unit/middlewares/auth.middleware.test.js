const env = require('../../../src/config/env');
const jwt = require('../../../src/core/utils/jwt.util');
const { authMiddleware, optionalAuthMiddleware } = require('../../../src/core/middlewares/auth.middleware');

// Mock prisma.user (singular, LPTM)
jest.mock('../../../src/lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

const prisma = require('../../../src/lib/prisma');
const mockPrismaUser = prisma.prisma.user;

const mockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

const userFor = (id, overrides = {}) => ({
  id,
  username: `u${id}`,
  email: `e${id}@x.com`,
  organizationId: 1,
  role: 'USER',
  clinics: [{ id: 99 }],
  ...overrides,
});

describe('auth.middleware', () => {
  const originalViaCookie = env.env.authViaCookie;
  const originalCookieName = env.env.authCookieName;

  beforeEach(() => {
    jest.clearAllMocks();
    env.env.authViaCookie = false;
    env.env.authCookieName = 'access_token';
  });

  afterAll(() => {
    env.env.authViaCookie = originalViaCookie;
    env.env.authCookieName = originalCookieName;
  });

  describe('modo legacy (viaCookie=false)', () => {
    it('deberia autenticar con Authorization Bearer', async () => {
      mockPrismaUser.findUnique.mockResolvedValueOnce(userFor(1, { role: 'ADMIN' }));
      const token = jwt.generateToken({ id: 1, username: 'u', email: 'e', organizationId: 1, role: 'ADMIN', clinicId: 99 });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      let nextCalled = false;
      await authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(1);
      expect(req.user.clinicId).toBe(99);
    });

    it('deberia rechazar si no hay header', async () => {
      const req = { headers: {} };
      const res = mockRes();
      await authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });

    it('deberia rechazar si el token es invalido', async () => {
      const req = { headers: { authorization: 'Bearer invalido' } };
      const res = mockRes();
      await authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });
  });

  describe('modo cookie (viaCookie=true)', () => {
    beforeEach(() => { env.env.authViaCookie = true; });

    it('deberia autenticar leyendo el cookie', async () => {
      mockPrismaUser.findUnique.mockResolvedValueOnce(userFor(2, { role: 'VET' }));
      const token = jwt.generateToken({ id: 2, username: 'u2', email: 'e2', organizationId: 1, role: 'VET', clinicId: 99 });
      const req = { headers: { cookie: `${env.env.authCookieName}=${token}` } };
      const res = mockRes();
      let nextCalled = false;
      await authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(2);
      expect(req.user.role).toBe('VET');
    });

    it('deberia autenticar con cookie aunque venga Authorization header', async () => {
      mockPrismaUser.findUnique.mockResolvedValueOnce(userFor(3, { role: 'ADMIN' }));
      const token = jwt.generateToken({ id: 3, username: 'u3', email: 'e3', organizationId: 1, role: 'ADMIN', clinicId: 99 });
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
          cookie: `${env.env.authCookieName}=${token}`,
        },
      };
      const res = mockRes();
      let nextCalled = false;
      await authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });

    it('deberia rechazar si la cookie no esta presente', async () => {
      const req = { headers: { cookie: 'session=other' } };
      const res = mockRes();
      await authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });

    it('deberia rechazar si la cookie esta pero el token es invalido', async () => {
      const req = { headers: { cookie: `${env.env.authCookieName}=basura` } };
      const res = mockRes();
      await authMiddleware(req, res, () => {});
      expect(res.statusCode).toBe(401);
    });
  });

  describe('no clinic assigned (NO_CLINIC_ASSIGNED)', () => {
    it('deberia responder 403 cuando el usuario no tiene clinica', async () => {
      env.env.authViaCookie = false;
      mockPrismaUser.findUnique.mockResolvedValueOnce(userFor(4, { clinics: [] }));
      const token = jwt.generateToken({ id: 4, username: 'u4', email: 'e4', organizationId: 1, role: 'USER', clinicId: 99 });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      let nextCalled = false;
      await authMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('NO_CLINIC_ASSIGNED');
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('deberia continuar sin error si no hay credenciales', async () => {
      env.env.authViaCookie = false;
      const req = { headers: {} };
      const res = mockRes();
      let nextCalled = false;
      await optionalAuthMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user).toBeUndefined();
    });

    it('deberia autenticar si el header es valido', async () => {
      env.env.authViaCookie = false;
      mockPrismaUser.findUnique.mockResolvedValueOnce(userFor(5));
      const token = jwt.generateToken({ id: 5, username: 'u5', email: 'e5', organizationId: 1, role: 'USER', clinicId: 99 });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      let nextCalled = false;
      await optionalAuthMiddleware(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(5);
    });
  });
});