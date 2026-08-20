const { validate } = require("../../../src/validation/validate.middleware");
const { AppError } = require("../../../src/core/errors/AppError");

jest.mock("../../../src/core/errors/AppError", () => ({
  AppError: function AppError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = "AppError";
    return error;
  }
}));

describe("validate middleware", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: {}, query: {}, params: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
  });

  describe("validación body", () => {
    it("debería llamar next() cuando el body es válido", () => {
      const Joi = require("joi");
      const testSchema = {
        body: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required()
        })
      };

      mockReq.body = { email: "test@example.com", password: "password123" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("debería llamar next con error cuando el body es inválido", () => {
      const Joi = require("joi");
      const testSchema = {
        body: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required()
        })
      };

      mockReq.body = { email: "invalid-email", password: "123" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
      expect(mockNext.mock.calls[0][0].message).toContain("Error de validación");
    });

    it("debería validar múltiples campos y reportar todos los errores", () => {
      const Joi = require("joi");
      const testSchema = {
        body: Joi.object({
          username: Joi.string().min(3).required(),
          email: Joi.string().email().required(),
          age: Joi.number().integer().min(18).required()
        })
      };

      mockReq.body = { username: "ab", email: "not-email", age: 15 };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain("username");
      expect(error.message).toContain("email");
      expect(error.message).toContain("age");
    });
  });

  describe("validación query", () => {
    it("debería validar query parameters", () => {
      const Joi = require("joi");
      const testSchema = {
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20)
        })
      };

      mockReq.query = { page: "2", limit: "50" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it("debería rechazar query parameters inválidos", () => {
      const Joi = require("joi");
      const testSchema = {
        query: Joi.object({
          page: Joi.number().integer().min(1),
          status: Joi.string().valid("active", "inactive")
        })
      };

      mockReq.query = { page: "0", status: "invalid" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe("validación params", () => {
    it("debería validar route parameters", () => {
      const Joi = require("joi");
      const testSchema = {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        })
      };

      mockReq.params = { id: "123" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it("debería rechazar params inválidos", () => {
      const Joi = require("joi");
      const testSchema = {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        })
      };

      mockReq.params = { id: "abc" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe("combinación de validaciones", () => {
    it("debería validar body, query y params simultáneamente", () => {
      const Joi = require("joi");
      const testSchema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ include: Joi.string().valid("details") }),
        params: Joi.object({ id: Joi.number().integer().required() })
      };

      mockReq.body = { name: "Test" };
      mockReq.query = { include: "details" };
      mockReq.params = { id: "42" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it("debería fallar si cualquiera de las validaciones falla", () => {
      const Joi = require("joi");
      const testSchema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ page: Joi.number().integer().min(1) }),
        params: Joi.object({ id: Joi.number().integer().required() })
      };

      mockReq.body = {};
      mockReq.query = { page: "0" };
      mockReq.params = { id: "invalid" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe("stripUnknown", () => {
    it("debería eliminar campos desconocidos del body", () => {
      const Joi = require("joi");
      const testSchema = {
        body: Joi.object({
          name: Joi.string().required()
        })
      };

      mockReq.body = { name: "Test", unknownField: "should be stripped" };
      
      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).not.toHaveProperty("unknownField");
    });
  });
});
