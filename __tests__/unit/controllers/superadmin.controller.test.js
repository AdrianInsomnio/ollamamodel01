// Mocks
const mockService = {
  createOrganization: jest.fn(),
};

const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
};

const mockNext = jest.fn();

// Mockear el servicio antes de importar el controlador
jest.mock('./superadmin.service', () => mockService);

// Importar el controlador después de mockear
const { createOrganization } = require('../../../src/modules/superadmin/superadmin.controller');

describe('SuperAdmin Controller - createOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRes.status.mockReturnThis();
    mockRes.json.mockClear();
    mockNext.mockClear();
  });

  it('should create an organization and return 201', async () => {
    const req = { body: { name: 'Test Org' } };
    const createdOrganization = { id: 1, name: 'Test Org' };

    mockService.createOrganization.mockResolvedValue(createdOrganization);

    await createOrganization(req, mockRes, mockNext);

    expect(mockService.createOrganization).toHaveBeenCalledWith(req.body);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(createdOrganization);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with error if service throws', async () => {
    const req = { body: { name: 'Test Org' } };
    const errorMessage = 'Database error';

    mockService.createOrganization.mockRejectedValue(new Error(errorMessage));

    await createOrganization(req, mockRes, mockNext);

    expect(mockService.createOrganization).toHaveBeenCalledWith(req.body);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe(errorMessage);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
