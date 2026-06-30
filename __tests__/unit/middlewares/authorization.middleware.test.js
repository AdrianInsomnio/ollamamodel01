const { authorize, authorizeOwnerOrAdmin, authorizeOrganization } = require('../../../src/core/middlewares/authorization.middleware');
const { ROLES } = require('../../../src/core/constants/roles');

describe('Authorization Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: null,
      params: {},
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('authorize', () => {
    it('debería permitir acceso si el rol está autorizado', () => {
      // Arrange
      req.user = { id: 1, role: ROLES.ADMIN };
      const middleware = authorize(ROLES.ADMIN, ROLES.VET);

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debería permitir acceso si el rol es uno de los permitidos', () => {
      // Arrange
      req.user = { id: 1, role: ROLES.VET };
      const middleware = authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER);

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('debería denegar acceso si el rol no está autorizado', () => {
      // Arrange
      req.user = { id: 1, role: ROLES.USER };
      const middleware = authorize(ROLES.ADMIN);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Access denied',
        details: {
          requiredRoles: [ROLES.ADMIN],
          currentRole: ROLES.USER
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si no hay usuario autenticado', () => {
      // Arrange
      req.user = null;
      const middleware = authorize(ROLES.ADMIN);

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería funcionar con múltiples roles permitidos', () => {
      // Arrange
      req.user = { id: 1, role: ROLES.VET };
      const middleware = authorize(ROLES.ADMIN, ROLES.VET, ROLES.USER);

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorizeOwnerOrAdmin', () => {
    it('debería permitir acceso si es el propietario del recurso', async () => {
      // Arrange
      req.user = { id: 1, role: ROLES.USER };
      const getResourceOwnerId = jest.fn().mockResolvedValue(1);
      const middleware = authorizeOwnerOrAdmin(getResourceOwnerId, ROLES.ADMIN);


      // Act
      await middleware(req, res, next);

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalled();
    });


    it('debería permitir acceso si tiene rol administrativo', async () => {
      // Arrange
      req.user = { id: 2, role: ROLES.ADMIN };
      const getResourceOwnerId = jest.fn().mockResolvedValue(1);
      const middleware = authorizeOwnerOrAdmin(getResourceOwnerId, ROLES.ADMIN, ROLES.VET);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('debería denegar acceso si no es propietario ni admin', async () => {
      // Arrange
      req.user = { id: 3, role: ROLES.USER };
      const getResourceOwnerId = jest.fn().mockResolvedValue(1);
      const middleware = authorizeOwnerOrAdmin(getResourceOwnerId, ROLES.ADMIN);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Access denied',
        details: {
          reason: 'You can only access your own resources'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si no hay usuario autenticado', async () => {
      // Arrange
      req.user = null;
      const middleware = authorizeOwnerOrAdmin(() => 1, ROLES.ADMIN);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorizeOrganization', () => {
    it('debería permitir acceso si la organización coincide', () => {
      // Arrange
      req.user = { id: 1, organizationId: 1 };
      req.params.organizationId = '1';
      const middleware = authorizeOrganization();

      // Act
      middleware(req, res, next);


      // Assert
      expect(next).toHaveBeenCalled();
    });


    it('debería permitir acceso si no hay organizationId en la request', () => {
      // Arrange
      req.user = { id: 1, organizationId: 1 };
      const middleware = authorizeOrganization();

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('debería denegar acceso si la organización no coincide', () => {
      // Arrange
      req.user = { id: 1, organizationId: 1 };
      req.params.organizationId = '2';
      const middleware = authorizeOrganization();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        code: 'FORBIDDEN',
        message: 'Access denied',
        details: {
          reason: 'You do not have access to this organization'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debería verificar organizationId en body', () => {
      // Arrange
      req.user = { id: 1, organizationId: 1 };
      req.body.organizationId = 2;
      const middleware = authorizeOrganization();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('debería verificar organizationId en query', () => {
      // Arrange
      req.user = { id: 1, organizationId: 1 };
      req.query.organizationId = '2';
      const middleware = authorizeOrganization();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('debería retornar 401 si no hay usuario autenticado', () => {
      // Arrange
      req.user = null;
      const middleware = authorizeOrganization();

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
