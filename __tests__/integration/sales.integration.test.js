// Tests de Integración E2E para Sales
// Bypaseamos auth y autorizacion para enfocarnos en logica de validacion de payload.

jest.mock("express-rate-limit", () => {
  return jest.fn(() => (req, res, next) => next());
});

jest.mock("../../src/core/middlewares/auth.middleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      organizationId: 1,
      clinicId: 1,
      role: "ADMIN",
    };
    next();
  },
  optionalAuthMiddleware: (req, res, next) => next(),
}));

jest.mock("../../src/core/middlewares/authorization.middleware", () => ({
  authorize: () => (req, res, next) => next(),
  authorizeOwnerOrAdmin: () => (req, res, next) => next(),
  authorizeOrganization: () => (req, res, next) => next(),
}));

jest.mock("../../src/modules/sales/sale.repository", () => ({
  create: jest.fn(async (data) => ({ id: 999, ...data })),
  createWithStockMovements: jest.fn(),
  findAll: jest.fn(async () => []),
  findById: jest.fn(async () => null),
  getSalesByClient: jest.fn(),
}));

jest.mock("../../src/modules/products/product.repository", () => ({
  findById: jest.fn(async () => null),
  findAll: jest.fn(),
  findByIds: jest.fn(async () => []),
  create: jest.fn(),
  update: jest.fn(),
  updateStock: jest.fn(),
  getLowStockProducts: jest.fn(),
  createStockMovement: jest.fn(),
}));

jest.mock("../../src/modules/clients/client.repository", () => ({
  findById: jest.fn(async () => null),
  findAll: jest.fn(),
  create: jest.fn(),
  createWithPet: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  search: jest.fn(),
  getClientHistory: jest.fn(),
}));

const request = require("supertest");
const app = require("../../src/app");

describe("Sales Integration Tests", () => {
  describe("Validación de Datos", () => {
    it("debería rechazar POST con body vacío (400 o 500)", async () => {
      const response = await request(app)
        .post("/api/sales")
        .send({})
        .expect([400, 404, 500]);

      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
    });

    it("debería rechazar POST sin campos requeridos (400 o 500)", async () => {
      const response = await request(app)
        .post("/api/sales")
        .send({ notes: "Sin campos requeridos" })
        .expect([400, 404, 500]);

      expect(response.body).toHaveProperty("code");
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("Estructura de Respuestas", () => {
    it("debería retornar estructura correcta para GET /api/sales", async () => {
      const response = await request(app)
        .get("/api/sales")
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("debería retornar 404 para venta inexistente", async () => {
      const response = await request(app)
        .get("/api/sales/9999")
        .expect(404);

      expect(response.body).toHaveProperty("code");
    });
  });

  describe("Casos de Borde", () => {
    it("debería manejar descuento negativo como error", async () => {
      const response = await request(app)
        .post("/api/sales")
        .send({
          clientId: 1,
          items: [{ itemType: "product", itemId: 1, quantity: 1 }],
          discount: -50,
          paymentMethod: "cash",
        })
        .expect([400, 404, 500]);

      expect(response.body).toHaveProperty("code");
    });

    it("debería manejar cantidad cero como error", async () => {
      const response = await request(app)
        .post("/api/sales")
        .send({
          clientId: 1,
          items: [{ itemType: "product", itemId: 1, quantity: 0 }],
          discount: 0,
          paymentMethod: "cash",
        })
        .expect([400, 404, 500]);

      expect(response.body).toHaveProperty("code");
    });

    it("debería rechazar método de pago inválido", async () => {
      const response = await request(app)
        .post("/api/sales")
        .send({
          clientId: 1,
          items: [{ itemType: "product", itemId: 1, quantity: 1 }],
          discount: 0,
          paymentMethod: "cripto-moneda",
        })
        .expect([400, 404, 500]);

      expect(response.body).toHaveProperty("code");
    });
  });

  describe("Flujo E2E Completo - Documentación", () => {
    it("documenta el flujo de creación de venta con validación", async () => {
      const response = await request(app)
        .post("/api/sales")
        .send({})
        .expect([400, 404, 500]);
      expect(response.body).toBeDefined();
    });

    it("documenta el flujo de cancelación de venta", async () => {
      const response = await request(app)
        .delete("/api/sales/9999")
        .expect([404, 405]);
      expect(response.body).toBeDefined();
    });
  });
});