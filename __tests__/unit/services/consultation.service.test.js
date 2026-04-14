const { faker } = require('@faker-js/faker/locale/es');
const consultationService = require('../../../src/modules/consultations/consultation.service');
const consultationRepository = require('../../../src/modules/consultations/consultation.repository');
const petRepository = require('../../../src/modules/pets/pet.repository');
const clientRepository = require('../../../src/modules/clients/client.repository');
const appointmentRepository = require('../../../src/modules/appointments/appointment.repository');
const { AppError } = require('../../../src/core/errors/AppError');

// Mocks
jest.mock('../../../src/modules/consultations/consultation.repository');
jest.mock('../../../src/modules/pets/pet.repository');
jest.mock('../../../src/modules/clients/client.repository');
jest.mock('../../../src/modules/appointments/appointment.repository');

const mockConsultationRepository = jest.mocked(consultationRepository);
const mockPetRepository = jest.mocked(petRepository);
const mockClientRepository = jest.mocked(clientRepository);
const mockAppointmentRepository = jest.mocked(appointmentRepository);

describe('Consultation Service', () => {
  let organizationId;
  let mockConsultation;
  let mockPet;
  let mockClient;
  let mockAppointment;

  beforeEach(() => {
    jest.clearAllMocks();

    organizationId = 1;
    mockClient = {
      id: 1,
      name: faker.person.fullName(),
      isActive: true
    };

    mockPet = {
      id: 1,
      name: faker.animal.dog(),
      species: 'Dog',
      clientId: mockClient.id,
      isActive: true,
      organizationId
    };

    mockAppointment = {
      id: 1,
      date: new Date(),
      status: 'completed',
      clientId: mockClient.id,
      petId: mockPet.id,
      organizationId
    };

    mockConsultation = {
      id: 1,
      petId: mockPet.id,
      clientId: mockClient.id,
      appointmentId: mockAppointment.id,
      weight: 25.5,
      temperature: 38.5,
      symptoms: 'Tos y fiebre',
      diagnosis: 'Infección respiratoria',
      treatment: 'Antibióticos y reposo',
      notes: 'Paciente estable',
      consultationFee: 50,
      treatmentFee: 30,
      totalFee: 80,
      organizationId,
      pet: mockPet,
      client: mockClient,
      appointment: mockAppointment,
      diagnoses: [],
      treatments: [],
      prescriptions: []
    };
  });

  describe('create', () => {
    it('debería crear una consulta exitosamente', async () => {
      // Arrange
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepository.create.mockResolvedValue(mockConsultation);

      // Act
      const result = await consultationService.create(mockConsultation, organizationId);

      // Assert
      expect(result).toEqual(mockConsultation);
      expect(mockConsultationRepository.create).toHaveBeenCalledWith(mockConsultation, organizationId);
    });

    it('debería lanzar error si faltan campos requeridos', async () => {
      // Arrange
      const invalidConsultation = { weight: 25.5 };

      // Act & Assert
      await expect(consultationService.create(invalidConsultation, organizationId)).rejects.toThrow('Pet and client are required');
    });

    it('debería lanzar error si la mascota no existe', async () => {
      // Arrange
      mockPetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(consultationService.create(mockConsultation, organizationId)).rejects.toThrow('Pet not found');
    });

    it('debería lanzar error si la mascota no pertenece al cliente', async () => {
      // Arrange
      const wrongPet = { ...mockPet, clientId: 999 };
      mockPetRepository.findById.mockResolvedValue(wrongPet);
      mockClientRepository.findById.mockResolvedValue(mockClient);

      // Act & Assert
      await expect(consultationService.create(mockConsultation, organizationId)).rejects.toThrow('Pet does not belong to this client');
    });

    it('debería lanzar error si el cliente no existe', async () => {
      // Arrange
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(consultationService.create(mockConsultation, organizationId)).rejects.toThrow('Client not found');
    });

    it('debería lanzar error si el peso es inválido', async () => {
      // Arrange
      const invalidConsultation = { ...mockConsultation, weight: -5 };
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(mockClient);

      // Act & Assert
      await expect(consultationService.create(invalidConsultation, organizationId)).rejects.toThrow('Weight must be greater than 0');
    });

    it('debería lanzar error si la temperatura es inválida', async () => {
      // Arrange
      const invalidConsultation = { ...mockConsultation, temperature: 50 };
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(mockClient);

      // Act & Assert
      await expect(consultationService.create(invalidConsultation, organizationId)).rejects.toThrow('Temperature must be between 36 and 42 degrees Celsius');
    });

    it('debería calcular la tarifa total automáticamente', async () => {
      // Arrange
      const consultationData = {
        ...mockConsultation,
        consultationFee: 60,
        treatmentFee: 40,
        totalFee: undefined // Should be calculated
      };

      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepository.create.mockResolvedValue({
        ...consultationData,
        totalFee: 100 // 60 + 40
      });

      // Act
      const result = await consultationService.create(consultationData, organizationId);

      // Assert
      expect(result.totalFee).toBe(100);
    });
  });

  describe('getAll', () => {
    it('debería retornar todas las consultas', async () => {
      // Arrange
      const consultations = [mockConsultation, { ...mockConsultation, id: 2 }];
      mockConsultationRepository.findAll.mockResolvedValue(consultations);

      // Act
      const result = await consultationService.getAll(organizationId);

      // Assert
      expect(result).toEqual(consultations);
      expect(mockConsultationRepository.findAll).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('getById', () => {
    it('debería retornar una consulta por ID', async () => {
      // Arrange
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);

      // Act
      const result = await consultationService.getById(mockConsultation.id, organizationId);

      // Assert
      expect(result).toEqual(mockConsultation);
      expect(mockConsultationRepository.findById).toHaveBeenCalledWith(mockConsultation.id, organizationId);
    });

    it('debería lanzar error si la consulta no existe', async () => {
      // Arrange
      mockConsultationRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(consultationService.getById(999, organizationId)).rejects.toThrow('Consultation not found');
    });
  });

  describe('getPetHistory', () => {
    it('debería retornar el historial médico de una mascota', async () => {
      // Arrange
      const consultations = [mockConsultation, { ...mockConsultation, id: 2, totalFee: 120 }];
      mockConsultationRepository.findByPetId.mockResolvedValue(consultations);

      // Act
      const result = await consultationService.getPetHistory(mockPet.id, organizationId);

      // Assert
      expect(result.petId).toBe(mockPet.id);
      expect(result.consultationCount).toBe(2);
      expect(result.totalSpent).toBe(200); // 80 + 120
    });

    it('debería lanzar error si no hay consultas para la mascota', async () => {
      // Arrange
      mockConsultationRepository.findByPetId.mockResolvedValue([]);

      // Act & Assert
      await expect(consultationService.getPetHistory(mockPet.id, organizationId)).rejects.toThrow('No consultations found for this pet');
    });
  });

  describe('addDiagnosis', () => {
    it('debería agregar un diagnóstico exitosamente', async () => {
      // Arrange
      const diagnosis = 'Infección bacteriana';
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);
      mockConsultationRepository.addDiagnosis.mockResolvedValue({ id: 1, description: diagnosis });

      // Act
      const result = await consultationService.addDiagnosis(mockConsultation.id, organizationId, diagnosis);

      // Assert
      expect(mockConsultationRepository.addDiagnosis).toHaveBeenCalledWith(mockConsultation.id, diagnosis);
    });

    it('debería lanzar error si la descripción está vacía', async () => {
      // Arrange
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);

      // Act & Assert
      await expect(consultationService.addDiagnosis(mockConsultation.id, organizationId, '')).rejects.toThrow('Diagnosis description is required');
    });
  });

  describe('addTreatment', () => {
    it('debería agregar un tratamiento exitosamente', async () => {
      // Arrange
      const treatment = 'Antibióticos orales';
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);
      mockConsultationRepository.addTreatment.mockResolvedValue({ id: 1, description: treatment });

      // Act
      const result = await consultationService.addTreatment(mockConsultation.id, organizationId, treatment);

      // Assert
      expect(mockConsultationRepository.addTreatment).toHaveBeenCalledWith(mockConsultation.id, treatment);
    });

    it('debería lanzar error si la descripción está vacía', async () => {
      // Arrange
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);

      // Act & Assert
      await expect(consultationService.addTreatment(mockConsultation.id, organizationId, '')).rejects.toThrow('Treatment description is required');
    });
  });

  describe('addPrescription', () => {
    it('debería agregar una prescripción exitosamente', async () => {
      // Arrange
      const prescription = 'Amoxicilina 500mg cada 8 horas por 7 días';
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);
      mockConsultationRepository.addPrescription.mockResolvedValue({ id: 1, description: prescription });

      // Act
      const result = await consultationService.addPrescription(mockConsultation.id, organizationId, prescription);

      // Assert
      expect(mockConsultationRepository.addPrescription).toHaveBeenCalledWith(mockConsultation.id, prescription);
    });

    it('debería lanzar error si la descripción está vacía', async () => {
      // Arrange
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);

      // Act & Assert
      await expect(consultationService.addPrescription(mockConsultation.id, organizationId, '')).rejects.toThrow('Prescription description is required');
    });
  });

  describe('update', () => {
    it('debería actualizar una consulta exitosamente', async () => {
      // Arrange
      const updatedData = { notes: 'Updated notes', weight: 26.0 };
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);
      mockConsultationRepository.update.mockResolvedValue({ ...mockConsultation, ...updatedData });

      // Act
      const result = await consultationService.update(mockConsultation.id, organizationId, updatedData);

      // Assert
      expect(mockConsultationRepository.update).toHaveBeenCalledWith(mockConsultation.id, organizationId, updatedData);
    });

    it('debería recalcular la tarifa total al actualizar', async () => {
      // Arrange
      const updatedData = { consultationFee: 70, treatmentFee: 50 };
      const expectedTotal = 120; // 70 + 50

      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);
      mockConsultationRepository.update.mockResolvedValue({
        ...mockConsultation,
        ...updatedData,
        totalFee: expectedTotal
      });

      // Act
      const result = await consultationService.update(mockConsultation.id, organizationId, updatedData);

      // Assert
      expect(result.totalFee).toBe(expectedTotal);
    });
  });

  describe('remove', () => {
    it('debería eliminar una consulta sin diagnósticos', async () => {
      // Arrange
      mockConsultationRepository.findById.mockResolvedValue(mockConsultation);
      mockConsultationRepository.remove.mockResolvedValue(mockConsultation);

      // Act
      const result = await consultationService.remove(mockConsultation.id, organizationId);

      // Assert
      expect(mockConsultationRepository.remove).toHaveBeenCalledWith(mockConsultation.id, organizationId);
    });

    it('debería lanzar error si la consulta tiene diagnósticos', async () => {
      // Arrange
      const consultationWithDiagnoses = {
        ...mockConsultation,
        diagnoses: [{ id: 1, description: 'Test diagnosis' }]
      };

      mockConsultationRepository.findById.mockResolvedValue(consultationWithDiagnoses);

      // Act & Assert
      await expect(consultationService.remove(mockConsultation.id, organizationId)).rejects.toThrow('Cannot delete consultation with existing diagnoses');
    });
  });
});
