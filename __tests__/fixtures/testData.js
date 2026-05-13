const { faker } = require('@faker-js/faker');
const { ROLES } = require('../../src/core/constants/roles');

// Datos de prueba para organizaciones
const createTestOrganization = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.company.name(),
  createdAt: faker.date.past(),
  ...overrides,
});

// Datos de prueba para usuarios
const createTestUser = (organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  password: faker.internet.password(),
  role: ROLES.USER,
  organizationId,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

// Datos de prueba para clientes
const createTestClient = (organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.person.fullName(),
  phone: faker.phone.number(),
  email: faker.internet.email(),
  organizationId,
  createdAt: faker.date.past(),
  ...overrides,
});

// Datos de prueba para mascotas
const createTestPet = (clientId, organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.animal.petName(),
  species: faker.helpers.arrayElement(['Perro', 'Gato', 'Conejo', 'Pájaro', 'Pez']),
  breed: faker.animal.dog(), // o cat() dependiendo de species
  clientId,
  organizationId,
  createdAt: faker.date.past(),
  ...overrides,
});

// Datos de prueba para productos
const createTestProduct = (organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price()),
  stock: faker.number.int({ min: 0, max: 100 }),
  minStock: faker.number.int({ min: 5, max: 20 }),
  organizationId,
  createdAt: faker.date.past(),
  ...overrides,
});

// Datos de prueba para citas
const createTestAppointment = (clientId, petId, organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  date: faker.date.future(),
  status: faker.helpers.arrayElement(['pending', 'confirmed', 'completed', 'cancelled']),
  notes: faker.lorem.sentence(),
  clientId,
  petId,
  organizationId,
  ...overrides,
});

// Datos de prueba para consultas
const createTestConsultation = (petId, clientId, organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  notes: faker.lorem.paragraph(),
  petId,
  clientId,
  organizationId,
  createdAt: faker.date.past(),
  ...overrides,
});

// Datos de prueba para diagnósticos
const createTestDiagnosis = (consultationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  description: faker.lorem.sentences(2),
  consultationId,
  ...overrides,
});

// Datos de prueba para tratamientos
const createTestTreatment = (consultationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.lorem.words(3),
  description: faker.lorem.sentences(2),
  dosage: faker.helpers.arrayElement(['5mg', '10mg', '1 tableta', '2ml']),
  frequency: faker.helpers.arrayElement(['Cada 8 horas', 'Cada 12 horas', 'Una vez al día', 'Cada 6 horas']),
  duration: faker.number.int({ min: 3, max: 14 }),
  consultationId,
  ...overrides,
});

// Datos de prueba para prescripciones
const createTestPrescription = (consultationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  medication: faker.lorem.words(2),
  dosage: faker.helpers.arrayElement(['5mg', '10mg', '1 tableta', '2ml']),
  frequency: faker.helpers.arrayElement(['Cada 8 horas', 'Cada 12 horas', 'Una vez al día']),
  duration: faker.number.int({ min: 3, max: 14 }),
  instructions: faker.lorem.sentences(2),
  consultationId,
  ...overrides,
});

// Datos de prueba para ventas
const createTestSale = (clientId, organizationId, overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  total: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
  discount: parseFloat(faker.commerce.price({ min: 0, max: 50 })),
  tax: parseFloat(faker.commerce.price({ min: 5, max: 70 })),
  finalTotal: 0, // Se calcula después
  clientId,
  organizationId,
  createdAt: faker.date.past(),
  ...overrides,
});

// Función para crear un conjunto completo de datos relacionados
const createCompleteTestData = () => {
  const organization = createTestOrganization();
  const user = createTestUser(organization.id);
  const client = createTestClient(organization.id);
  const pet = createTestPet(client.id, organization.id);
  const product = createTestProduct(organization.id);
  const appointment = createTestAppointment(client.id, pet.id, organization.id);
  const consultation = createTestConsultation(pet.id, client.id, organization.id);
  const diagnosis = createTestDiagnosis(consultation.id);
  const treatment = createTestTreatment(consultation.id);
  const prescription = createTestPrescription(consultation.id);
  const sale = createTestSale(client.id, organization.id);

  return {
    organization,
    user,
    client,
    pet,
    product,
    appointment,
    consultation,
    diagnosis,
    treatment,
    prescription,
    sale,
  };
};

module.exports = {
  createTestOrganization,
  createTestUser,
  createTestClient,
  createTestPet,
  createTestProduct,
  createTestAppointment,
  createTestConsultation,
  createTestDiagnosis,
  createTestTreatment,
  createTestPrescription,
  createTestSale,
  createCompleteTestData,
};
