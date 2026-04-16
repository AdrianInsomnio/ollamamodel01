// Configuración global para tests
const { faker } = require('@faker-js/faker');

// Hacer faker disponible globalmente
global.faker = faker;

// Configurar variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db';

// Configurar timezone para consistencia en tests
process.env.TZ = 'UTC';

// Silenciar logs durante tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Silenciar logs durante tests (opcional, descomentar si es necesario)
  // console.log = jest.fn();
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterAll(() => {
  // Restaurar logs después de tests
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Configurar Jest para manejar async operations
jest.setTimeout(10000);

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});