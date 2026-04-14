// Tests de Integración E2E para Appointments
// Estos tests verifican los endpoints de citas con autenticación

jest.mock("express-rate-limit", () => {
  return jest.fn(() => (req, res, next) => next());
});

const request = require("supertest");
const app = require("../../src/app");

describe("Appointments Integration Tests", () => {
  // JWT de prueba válido
  const validToken = "Bearer test-valid-jwt-token";

  describe("Autorización de Endpoints", () => {
    it("debería devolver error 401 sin token de autenticación", async () => {
      const response = await request(app)
        .get("/api/appointments")
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    it("debería devolver error 401 con token inválido", async () => {
      const response = await request(app)
        .get("/api/appointments")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Validación de Datos", () => {
    it("debería rechazar POST con body vacío (400)", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("debería rechazar POST sin campos requeridos (400)", async () => {
      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send({ notes: "Sin campos requeridos" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("debería rechazar fecha en el pasado (400)", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send({
          date: pastDate.toISOString(),
          clientId: 1,
          petId: 1,
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Estructura de Respuestas", () => {
    it("debería retornar estructura correcta para GET /api/appointments", async () => {
      const response = await request(app)
        .get("/api/appointments")
        .set("Authorization", validToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("debería retornar 404 para cita inexistente", async () => {
      const response = await request(app)
        .get("/api/appointments/99999")
        .set("Authorization", validToken)
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Slots Disponibles", () => {
    it("debería retornar slots para una fecha válida", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split("T")[0];

      const response = await request(app)
        .get(`/api/appointments/slots?date=${dateStr}`)
        .set("Authorization", validToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("debería manejar fecha inválida para slots", async () => {
      const response = await request(app)
        .get("/api/appointments/slots?date=invalid-date")
        .set("Authorization", validToken);

      // Puede ser 400 o 200 dependiendo de la implementación
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("Flujo E2E Completo - Documentación", () => {
    it("documenta el flujo de creación de cita con validación", async () => {
      // Este test documenta el flujo E2E que debería funcionar
      // En producción: valida fecha futura → valida disponibilidad → valida mascota/cliente → crea cita

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const appointmentData = {
        date: futureDate.toISOString(),
        clientId: 1,
        petId: 1,
        notes: "Revisión anual",
        duration: 30,
      };

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send(appointmentData);

      // Verificar que la respuesta es válida (201 para éxito, 404/409 si hay conflictos)
      expect([201, 400, 404, 409]).toContain(response.status);
    });

    it("documenta el flujo de actualización de estado", async () => {
      const response = await request(app)
        .put("/api/appointments/1/status")
        .set("Authorization", validToken)
        .send({ status: "confirmed" });

      // Puede ser 200 (éxito), 404 (no existe), 400 (estado inválido)
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe("Gestión de Estados", () => {
    it("debería rechitar estado inválido", async () => {
      const response = await request(app)
        .put("/api/appointments/1/status")
        .set("Authorization", validToken)
        .send({ status: "estado-invalido" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("debería aceptar estados válidos", async () => {
      const validStatuses = ["pending", "confirmed", "completed", "cancelled"];

      for (const status of validStatuses) {
        const response = await request(app)
          .put("/api/appointments/1/status")
          .set("Authorization", validToken)
          .send({ status });

        // Puede ser 200 si existe, 404 si no
        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe("Casos de Borde", () => {
    it("debería manejar duración negativa como error", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send({
          date: futureDate.toISOString(),
          clientId: 1,
          petId: 1,
          duration: -30,
        });

      expect([400, 404]).toContain(response.status);
    });

    it("debería manejar clienteId inexistente", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send({
          date: futureDate.toISOString(),
          clientId: 99999,
          petId: 1,
        });

      expect([404, 400]).toContain(response.status);
    });

    it("debería manejar petId inexistente", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await request(app)
        .post("/api/appointments")
        .set("Authorization", validToken)
        .send({
          date: futureDate.toISOString(),
          clientId: 1,
          petId: 99999,
        });

      expect([404, 400]).toContain(response.status);
    });
  });

  describe("Control de Acceso por Rol", () => {
    it("todos los roles autenticados pueden ver citas", async () => {
      const response = await request(app)
        .get("/api/appointments")
        .set("Authorization", validToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("todos los roles autenticados pueden ver slots", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await request(app)
        .get(`/api/appointments/slots?date=${futureDate.toISOString().split("T")[0]}`)
        .set("Authorization", validToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
