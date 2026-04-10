const request = require('supertest');
const app = require('../../src/app');

// Mock completo del módulo prisma antes de cualquier importación
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/lib/prisma');
const { createTestOrganization, createTestUser } = require('../fixtures/testData');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegisterData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('debería registrar un usuario y devolver token', async () => {
      // Arrange
      const mockOrganization = createTestOrganization({
        name: 'testuser\'s Organization'
      });
      const mockUser = createTestUser(mockOrganization.id, {
        username: validRegisterData.username,
        email: validRegisterData.email,
      });

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockOrganization);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('organization');
      expect(response.body.user.username).toBe(validRegisterData.username);
      expect(response.body.user.email).toBe(validRegisterData.email);
    });

    it('debería devolver error 400 si faltan campos requeridos', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test' }) // Faltan email y password
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    it('debería devolver error 400 si el usuario ya existe', async () => {
      // Arrange
      const existingUser = createTestUser(1);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
      organizationId: 1,
    };

    it('debería hacer login y devolver token', async () => {
      // Arrange
      const mockUser = createTestUser(validLoginData.organizationId, {
        email: validLoginData.email,
        password: 'hashedPassword',
      });

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validLoginData.email);
    });

    it('debería devolver error 400 si faltan campos requeridos', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }) // Faltan password y organizationId
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    it('debería devolver error 401 si las credenciales son inválidas', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('Rate Limiting', () => {
    it('debería aplicar rate limiting en endpoints de auth', async () => {
      // Arrange
      const requests = Array(6).fill().map(() => // Más que el límite de 5
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong',
            organizationId: 1,
          })
      );

      // Act - Hacer múltiples requests
      const responses = await Promise.all(requests);

      // Assert - Al menos una debería ser rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body).toHaveProperty('error');
    });
  });
});