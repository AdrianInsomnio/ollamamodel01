// Mocks directos
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  organization: {
    create: jest.fn(),
  },
};

const mockUtils = {
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
};

// Mockear las dependencias ANTES de importar el módulo que las usa
jest.mock('../../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../../src/core/utils/password.util', () => mockUtils);
jest.mock('../../../src/core/utils/jwt.util', () => mockUtils);
jest.mock('../../../src/core/errors/AppError', () => ({
  AppError: function AppError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = 'AppError';
    return error;
  }
}));

const authService = require('../../../src/modules/auth/auth.service');
const { createTestOrganization, createTestUser } = require('../../fixtures/testData');

// Importar el mock de AppError para las verificaciones
const mockAppError = require('../../../src/core/errors/AppError');

describe('Auth Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('debería registrar un usuario exitosamente', async () => {
      // Arrange
      const mockOrganization = createTestOrganization({ name: 'testuser\'s Organization' });
      const mockUser = createTestUser(mockOrganization.id, {
        username: validUserData.username,
        email: validUserData.email,
      });
      const mockToken = 'mock.jwt.token';

      mockPrisma.user.findFirst.mockResolvedValue(null); // Usuario no existe
      mockPrisma.organization.create.mockResolvedValue(mockOrganization);
      mockUtils.hashPassword.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockUtils.generateToken.mockReturnValue(mockToken);

      // Act
      const result = await authService.register(
        validUserData.username,
        validUserData.email,
        validUserData.password
      );

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: validUserData.email },
            { username: validUserData.username }
          ]
        }
      });
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: { name: `${validUserData.username}'s Organization` }
      });
      expect(mockUtils.hashPassword).toHaveBeenCalledWith(validUserData.password);
      expect(mockUtils.generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        organizationId: mockOrganization.id,
        role: 'admin'
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          organizationId: mockOrganization.id
        },
        token: mockToken,
        organization: {
          id: mockOrganization.id,
          name: mockOrganization.name
        }
      });
    });

    it('debería lanzar error si el usuario ya existe', async () => {
      // Arrange
      const existingUser = createTestUser(1);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.register(
        validUserData.username,
        validUserData.email,
        validUserData.password
      )).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
      organizationId: 1,
    };

    it('debería hacer login exitosamente', async () => {
      // Arrange
      const mockUser = createTestUser(validLoginData.organizationId, {
        email: validLoginData.email,
        password: 'hashedPassword',
      });
      const mockToken = 'mock.jwt.token';

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockUtils.comparePassword.mockResolvedValue(true);
      mockUtils.generateToken.mockReturnValue(mockToken);

      // Act
      const result = await authService.login(
        validLoginData.email,
        validLoginData.password,
        validLoginData.organizationId
      );

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(validLoginData.email);
    });

    it('debería lanzar error si las credenciales son inválidas', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(
        validLoginData.email,
        validLoginData.password,
        validLoginData.organizationId
      )).rejects.toThrow('Invalid credentials');
    });
  });
});