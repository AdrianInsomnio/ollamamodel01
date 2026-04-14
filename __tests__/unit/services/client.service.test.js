const { faker } = require('@faker-js/faker/locale/es');
const clientService = require('../../../src/modules/clients/client.service');
const clientRepository = require('../../../src/modules/clients/client.repository');
const { AppError } = require('../../../src/core/errors/AppError');

// Mocks
jest.mock('../../../src/modules/clients/client.repository');

const mockClientRepository = jest.mocked(clientRepository);

describe('Client Service', () => {
  let organizationId;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    organizationId = 1;
    mockClient = {
      id: 1,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: '+5989123456',
      documentId: faker.string.alphanumeric(8),
      isActive: true,
      organizationId
    };
  });

  describe('create', () => {
    it('debería crear un cliente exitosamente', async () => {
      // Arrange
      mockClientRepository.findByEmail.mockResolvedValue(null);
      mockClientRepository.findByDocumentId.mockResolvedValue(null);
      mockClientRepository.create.mockResolvedValue(mockClient);

      // Act
      const result = await clientService.create(mockClient, organizationId);

      // Assert
      expect(result).toEqual(mockClient);
      expect(mockClientRepository.create).toHaveBeenCalledWith(mockClient, organizationId);
    });

    it('debería lanzar error si falta el nombre', async () => {
      // Arrange
      const invalidClient = { ...mockClient, name: '' };

      // Act & Assert
      await expect(clientService.create(invalidClient, organizationId)).rejects.toThrow('Client name is required');
    });

    it('debería lanzar error si el email es inválido', async () => {
      // Arrange
      const invalidClient = { ...mockClient, email: 'invalid-email' };

      // Act & Assert
      await expect(clientService.create(invalidClient, organizationId)).rejects.toThrow('Invalid email format');
    });

    it('debería lanzar error si el email ya existe', async () => {
      // Arrange
      mockClientRepository.findByEmail.mockResolvedValue(mockClient);

      // Act & Assert
      await expect(clientService.create(mockClient, organizationId)).rejects.toThrow('Email already in use');
    });

    it('debería lanzar error si el teléfono es inválido', async () => {
      // Arrange
      const invalidClient = { ...mockClient, phone: '123' };
      mockClientRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(clientService.create(invalidClient, organizationId)).rejects.toThrow('Invalid phone format');
    });

    it('debería lanzar error si el documentId ya existe', async () => {
      // Arrange
      mockClientRepository.findByEmail.mockResolvedValue(null);
      mockClientRepository.findByDocumentId.mockResolvedValue(mockClient);

      // Act & Assert
      await expect(clientService.create(mockClient, organizationId)).rejects.toThrow('Document ID already in use');
    });
  });

  describe('getAll', () => {
    it('debería retornar todos los clientes', async () => {
      // Arrange
      const clients = [mockClient, { ...mockClient, id: 2 }];
      mockClientRepository.findAll.mockResolvedValue(clients);

      // Act
      const result = await clientService.getAll(organizationId);

      // Assert
      expect(result).toEqual(clients);
      expect(mockClientRepository.findAll).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('getById', () => {
    it('debería retornar un cliente por ID', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(mockClient);

      // Act
      const result = await clientService.getById(mockClient.id, organizationId);

      // Assert
      expect(result).toEqual(mockClient);
      expect(mockClientRepository.findById).toHaveBeenCalledWith(mockClient.id, organizationId);
    });

    it('debería lanzar error si el cliente no existe', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(clientService.getById(999, organizationId)).rejects.toThrow('Client not found');
    });
  });

  describe('getClientHistory', () => {
    it('debería retornar el historial del cliente con estadísticas', async () => {
      // Arrange
      const clientWithHistory = {
        ...mockClient,
        pets: [{ id: 1, name: 'Rex' }],
        sales: [{ id: 1, total: 100 }, { id: 2, total: 200 }],
        appointments: [{ id: 1, date: new Date() }],
        consultations: [{ id: 1 }]
      };
      mockClientRepository.getClientHistory.mockResolvedValue(clientWithHistory);

      // Act
      const result = await clientService.getClientHistory(mockClient.id, organizationId);

      // Assert
      expect(result).toHaveProperty('stats');
      expect(result.stats.totalPets).toBe(1);
      expect(result.stats.totalSales).toBe(2);
      expect(result.stats.totalSpent).toBe(300);
    });

    it('debería lanzar error si el cliente no existe', async () => {
      // Arrange
      mockClientRepository.getClientHistory.mockResolvedValue(null);

      // Act & Assert
      await expect(clientService.getClientHistory(999, organizationId)).rejects.toThrow('Client not found');
    });
  });

  describe('update', () => {
    it('debería actualizar un cliente exitosamente', async () => {
      // Arrange
      const updatedData = { name: 'New Name', phone: '+5989654321' };
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockClientRepository.update.mockResolvedValue({ ...mockClient, ...updatedData });

      // Act
      const result = await clientService.update(mockClient.id, organizationId, updatedData);

      // Assert
      expect(mockClientRepository.update).toHaveBeenCalledWith(mockClient.id, organizationId, updatedData);
    });

    it('debería lanzar error si el email actualizado ya existe', async () => {
      // Arrange
      const existingClient = { id: 2, email: 'existing@example.com' };
      const updatedData = { email: 'existing@example.com' };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockClientRepository.findByEmail.mockResolvedValue(existingClient);

      // Act & Assert
      await expect(clientService.update(mockClient.id, organizationId, updatedData)).rejects.toThrow('Email already in use');
    });
  });

  describe('remove', () => {
    it('debería eliminar un cliente', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockClientRepository.remove.mockResolvedValue(mockClient);

      // Act
      const result = await clientService.remove(mockClient.id, organizationId);

      // Assert
      expect(mockClientRepository.remove).toHaveBeenCalledWith(mockClient.id, organizationId);
    });

    it('debería lanzar error si el cliente no existe', async () => {
      // Arrange
      mockClientRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(clientService.remove(999, organizationId)).rejects.toThrow('Client not found');
    });
  });
});
