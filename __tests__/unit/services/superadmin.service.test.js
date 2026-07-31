// Mocks
const mockRepository = {
  createOrganization: jest.fn(),
};

const mockRes = {};
const mockNext = jest.fn();

// Mockear el repositorio antes de importar el servicio
jest.mock('../../../src/modules/superadmin/superadmin.repository', () => mockRepository);

// Importar el servicio despu�s de mockear
const { createOrganization } = require('../../../src/modules/superadmin/superadmin.service');

describe('SuperAdmin Service - createOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an organization', async () => {
    const inputData = { name: 'Test Org' };
    const expectedOrganization = { id: 1, name: 'Test Org' };

    mockRepository.createOrganization.mockResolvedValue(expectedOrganization);

    const result = await createOrganization(inputData);

    expect(mockRepository.createOrganization).toHaveBeenCalledWith(inputData);
    expect(result).toEqual(expectedOrganization);
  });

  it('should throw an error if repository fails', async () => {
    const inputData = { name: 'Test Org' };
    const errorMessage = 'Database error';

    mockRepository.createOrganization.mockRejectedValue(new Error(errorMessage));

    await expect(createOrganization(inputData)).rejects.toThrow(errorMessage);
  });
});

