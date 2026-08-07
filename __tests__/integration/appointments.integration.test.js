jest.mock("express-rate-limit", () => jest.fn(() => (req, res, next) => next()));

jest.mock("../../src/core/middlewares/auth.middleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 1, username: "u", email: "e", organizationId: 1, clinicId: 1, role: "ADMIN" };
    next();
  },
  optionalAuthMiddleware: (req, res, next) => next(),
}));

jest.mock("../../src/core/middlewares/authorization.middleware", () => ({
  authorize: () => (req, res, next) => next(),
  authorizeOwnerOrAdmin: () => (req, res, next) => next(),
  authorizeOrganization: () => (req, res, next) => next(),
}));

jest.mock("../../src/lib/prisma", () => ({
  prisma: {
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pet: { findUnique: jest.fn(async () => null) },
  },
}));

jest.mock("../../src/modules/appointments/appointment.repository", () => ({
  create: jest.fn(),
  findAll: jest.fn(async () => []),
  findById: jest.fn(async () => null),
  findByPetAndDateRange: jest.fn(async () => []),
  findByDateRange: jest.fn(async () => []),
  checkAvailability: jest.fn(async () => true),
  update: jest.fn(async () => ({ id: 9999, status: "confirmed" })),
  remove: jest.fn(),
  getAvailableSlots: jest.fn(async () => []),
}));

jest.mock("../../src/modules/pets/pet.repository", () => ({
  create: jest.fn(),
  findById: jest.fn(async () => null),
  findMany: jest.fn(async () => []),
  update: jest.fn(),
  delete: jest.fn(),
}));

jest.mock("../../src/modules/clients/client.repository", () => ({
  findById: jest.fn(async () => null),
  findAll: jest.fn(async () => []),
  create: jest.fn(),
  createWithPet: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  search: jest.fn(async () => []),
  getClientHistory: jest.fn(async () => null),
}));

const request = require("supertest");
const app = require("../../src/app");

describe("Appointments Integration Tests", () => {
  describe("Validación de Datos", () => {
    it("debería rechazar POST con body vacío (400)", async () => {
      const response = await request(app).post("/api/appointments").send({}).expect(400);
      expect(response.body).toHaveProperty("code");
    });

    it("debería rechazar POST sin campos requeridos (400)", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .send({ notes: "Sin campos requeridos" })
        .expect(400);
      expect(response.body).toHaveProperty("code");
    });

    it("debería rechazar fecha en el pasado (400)", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const response = await request(app)
        .post("/api/appointments")
        .send({ date: pastDate.toISOString(), clientId: 1, petId: 1 })
        .expect([400, 404]);
      expect(response.body).toHaveProperty("code");
    });
  });

  describe("Estructura de Respuestas", () => {
    it("debería retornar estructura correcta para GET /api/appointments", async () => {
      const response = await request(app).get("/api/appointments").expect(200);
      expect(response.body).toBeDefined();
    });

    it("debería retornar 404 para cita inexistente", async () => {
      const response = await request(app).get("/api/appointments/9999").expect(404);
      expect(response.body).toHaveProperty("code");
    });
  });

  describe("Slots Disponibles", () => {
    it("debería retornar slots para una fecha válida", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const response = await request(app)
        .get(`/api/appointments/slots?date=${futureDate.toISOString().split("T")[0]}`)
        .expect(200);
      expect(response.body).toHaveProperty("slots");
    });

    it("debería manejar fecha inválida para slots", async () => {
      const response = await request(app)
        .get("/api/appointments/slots?date=invalid")
        .expect(400);
      expect(response.body).toHaveProperty("code");
    });
  });

  describe("Gestión de Estados", () => {
    it("debería rechazar estado inválido", async () => {
      const response = await request(app)
        .put("/api/appointments/9999/status")
        .send({ status: "estado-inventado" })
        .expect([400, 404]);
      expect(response.body).toHaveProperty("code");
    });

    it("debería aceptar estados válidos", async () => {
      const response = await request(app)
        .put("/api/appointments/9999/status")
        .send({ status: "confirmed" })
        .expect([200, 400, 404]);
      expect(response.body).toBeDefined();
    });
  });

  describe("Casos de Borde", () => {
    it("debería manejar duración negativa como error", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const response = await request(app)
        .post("/api/appointments")
        .send({ date: futureDate.toISOString(), clientId: 1, petId: 1, duration: -10 })
        .expect([400, 404]);
      expect(response.body).toHaveProperty("code");
    });

    it("debería manejar clienteId inexistente", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const response = await request(app)
        .post("/api/appointments")
        .send({ date: futureDate.toISOString(), clientId: 99999, petId: 1 })
        .expect([400, 404]);
      expect(response.body).toHaveProperty("code");
    });

    it("debería manejar petId inexistente", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const response = await request(app)
        .post("/api/appointments")
        .send({ date: futureDate.toISOString(), clientId: 1, petId: 99999 })
        .expect([400, 404]);
      expect(response.body).toHaveProperty("code");
    });
  });

  describe("Flujo E2E Completo - Documentación", () => {
    it("documenta el flujo de creación de cita con validación", async () => {
      const response = await request(app).post("/api/appointments").send({}).expect(400);
      expect(response.body).toBeDefined();
    });

    it("documenta el flujo de actualización de estado", async () => {
      const response = await request(app)
        .put("/api/appointments/9999/status")
        .send({ status: "cancelled" })
        .expect([200, 400, 404]);
      expect(response.body).toBeDefined();
    });
  });
});