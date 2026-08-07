jest.mock("../../src/lib/prisma", () => {
  const txResult = {
    org: { id: 1, name: "testuser's Organization" },
    clinics: [{ id: 1, name: "Clinica 1", organizationId: 1 }],
  };
  const handler = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    clinic: {
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(async () => txResult),
  };
  return {
    prisma: handler,
    __txResult: txResult,
  };
});

// Mock del userRepository
jest.mock("../../src/modules/auth/auth.repository", () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  updatePassword: jest.fn(),
}));

// Mock de las utilidades de password y jwt
jest.mock("../../src/core/utils/password.util", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock("../../src/core/utils/jwt.util", () => ({
  generateToken: jest.fn(),
}));

// Mock de express-rate-limit para deshabilitar rate limiting en tests
jest.mock("express-rate-limit", () => {
  return jest.fn(() => (req, res, next) => next());
});

const request = require("supertest");
const app = require("../../src/app");
const prismaModule = require("../../src/lib/prisma");
const userRepository = require("../../src/modules/auth/auth.repository");
const {
  hashPassword,
  comparePassword,
} = require("../../src/core/utils/password.util");
const { generateToken } = require("../../src/core/utils/jwt.util");

const mockPrisma = prismaModule.prisma;
const mockUserRepository = userRepository;
const mockHashPassword = hashPassword;
const mockComparePassword = comparePassword;
const mockGenerateToken = generateToken;
const {
  createTestUser,
} = require("../fixtures/testData");

describe("Auth Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-mock $transaction after clearAllMocks
    mockPrisma.$transaction.mockImplementation(async () => ({
      org: { id: 1, name: "testuser's Organization" },
      clinics: [{ id: 1, name: "Clinica 1", organizationId: 1 }],
    }));
  });

  describe("POST /api/auth/register", () => {
    const validRegisterData = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      role: "USER",
      clinicIds: [1],
    };

    it("debería registrar un usuario y devolver token", async () => {
      // Arrange: escenario bootstrap (tabla vacia)
      const mockOrganization = { id: 1, name: "testuser's Organization" };
      const mockClinic = { id: 1, name: "Clinica 1", organizationId: mockOrganization.id };
      const mockUser = {
        id: 1,
        username: validRegisterData.username,
        email: validRegisterData.email,
        role: "SUPER_ADMIN",
        organizationId: mockOrganization.id,
        clinics: [mockClinic],
      };

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.clinic.findMany.mockResolvedValue([]);
      mockPrisma.organization.create.mockResolvedValue(mockOrganization);
      mockPrisma.clinic.upsert.mockResolvedValue(mockClinic);
      mockHashPassword.mockResolvedValue("hashedPassword");
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegisterData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty("message", "User created successfully");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.username).toBe(validRegisterData.username);
      expect(response.body.user.email).toBe(validRegisterData.email);
    });

    it("debería devolver error 400 si faltan campos requeridos", async () => {
      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send({ username: "test" })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
    });

    it("debería devolver error 400 si el usuario ya existe", async () => {
      // Arrange: bootstrap pero el email/username ya están tomados
      const existingUser = createTestUser(1);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegisterData)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message", "User already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    const validLoginData = {
      email: "test@example.com",
      password: "password123",
    };

    it("debería hacer login y devolver token", async () => {
      // Arrange
      const mockUser = createTestUser(1, {
        email: validLoginData.email,
        password: "hashedPassword",
        clinics: [{ id: 99, name: "Clinica 99" }],
      });

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue("mockLoginToken");

      // Act
      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(validLoginData.email);
    });

    it("debería devolver error 400 si faltan campos requeridos", async () => {
      // Act
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com" })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
    });

    it("debería devolver error 401 si las credenciales son inválidas", async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("Rate Limiting", () => {
    it("debería responder correctamente a requests de auth (rate limiting mockeado)", async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "x@x.com", password: "123456" })
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty("message");
    });
  });
});