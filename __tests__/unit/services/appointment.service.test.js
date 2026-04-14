const { faker } = require('@faker-js/faker/locale/es');
const appointmentService = require('../../../src/modules/appointments/appointment.service');
const appointmentRepository = require('../../../src/modules/appointments/appointment.repository');
const petRepository = require('../../../src/modules/pets/pet.repository');
const clientRepository = require('../../../src/modules/clients/client.repository');
const { AppError } = require('../../../src/core/errors/AppError');

jest.mock('../../../src/modules/appointments/appointment.repository');
jest.mock('../../../src/modules/pets/pet.repository');
jest.mock('../../../src/modules/clients/client.repository');

const mockAppointmentRepository = jest.mocked(appointmentRepository);
const mockPetRepository = jest.mocked(petRepository);
const mockClientRepository = jest.mocked(clientRepository);

describe('Appointment Service', () => {
  let organizationId;
  let mockPet;
  let mockClient;
  let mockAppointment;

  beforeEach(() => {
    jest.clearAllMocks();
    organizationId = 1;
    mockClient = {
      id: 1,
      name: faker.person.fullName(),
      organizationId
    };
    mockPet = {
      id: 1,
      name: faker.animal.dog(),
      clientId: mockClient.id,
      organizationId
    };
    mockAppointment = {
      id: 1,
      date: new Date(Date.now() + 3600000),
      duration: 30,
      status: 'pending',
      clientId: mockClient.id,
      petId: mockPet.id,
      organizationId
    };
  });

  describe('create', () => {
    it('debería crear una cita exitosamente', async () => {
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockAppointmentRepository.checkAvailability.mockResolvedValue(true);
      mockAppointmentRepository.create.mockResolvedValue(mockAppointment);

      const result = await appointmentService.create({
        date: mockAppointment.date,
        petId: mockPet.id,
        clientId: mockClient.id,
        duration: mockAppointment.duration,
        serviceType: 'consulta'
      }, organizationId);

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        date: mockAppointment.date,
        petId: mockPet.id,
        clientId: mockClient.id,
        duration: mockAppointment.duration,
        serviceType: 'consulta'
      }), organizationId);
    });

    it('debería lanzar error si faltan campos requeridos', async () => {
      await expect(appointmentService.create({ petId: mockPet.id }, organizationId)).rejects.toThrow('Date, pet and client are required');
    });

    it('debería lanzar error si la fecha es pasada', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      await expect(appointmentService.create({ date: pastDate, petId: mockPet.id, clientId: mockClient.id }, organizationId)).rejects.toThrow('Appointment date cannot be in the past');
    });

    it('debería lanzar error si la mascota no existe', async () => {
      mockPetRepository.findById.mockResolvedValue(null);
      await expect(appointmentService.create({ date: mockAppointment.date, petId: mockPet.id, clientId: mockClient.id }, organizationId)).rejects.toThrow('Pet not found');
    });

    it('debería lanzar error si la mascota no pertenece al cliente', async () => {
      mockPetRepository.findById.mockResolvedValue({ ...mockPet, clientId: 999 });
      mockClientRepository.findById.mockResolvedValue(mockClient);
      await expect(appointmentService.create({ date: mockAppointment.date, petId: mockPet.id, clientId: mockClient.id }, organizationId)).rejects.toThrow('Pet does not belong to this client');
    });

    it('debería lanzar error si el cliente no existe', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(null);
      await expect(appointmentService.create({ date: mockAppointment.date, petId: mockPet.id, clientId: mockClient.id }, organizationId)).rejects.toThrow('Client not found');
    });

    it('debería lanzar error si la franja horaria no está disponible', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockAppointmentRepository.checkAvailability.mockResolvedValue(false);
      await expect(appointmentService.create({ date: mockAppointment.date, petId: mockPet.id, clientId: mockClient.id }, organizationId)).rejects.toThrow('Time slot is not available');
    });
  });

  describe('getAvailableSlots', () => {
    it('debería retornar slots disponibles', async () => {
      const date = new Date(Date.now() + 86400000);
      mockAppointmentRepository.findByDateRange.mockResolvedValue([]);

      const slots = await appointmentService.getAvailableSlots(date, organizationId);
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe('updateStatus', () => {
    it('debería actualizar el estado de la cita', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.update.mockResolvedValue({ ...mockAppointment, status: 'confirmed' });

      const result = await appointmentService.updateStatus(mockAppointment.id, organizationId, 'confirmed');
      expect(result.status).toBe('confirmed');
      expect(mockAppointmentRepository.update).toHaveBeenCalledWith(mockAppointment.id, organizationId, { status: 'confirmed' });
    });

    it('debería lanzar error si el estado es inválido', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      await expect(appointmentService.updateStatus(mockAppointment.id, organizationId, 'invalid')).rejects.toThrow('Invalid appointment status');
    });
  });

  describe('getById', () => {
    it('debería retornar la cita por ID', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      const result = await appointmentService.getById(mockAppointment.id, organizationId);
      expect(result).toEqual(mockAppointment);
    });

    it('debería lanzar error si no existe la cita', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(null);
      await expect(appointmentService.getById(999, organizationId)).rejects.toThrow('Appointment not found');
    });
  });

  describe('update', () => {
    it('debería actualizar la cita correctamente', async () => {
      const updatedData = { duration: 45 }; 
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.checkAvailability.mockResolvedValue(true);
      mockAppointmentRepository.update.mockResolvedValue({ ...mockAppointment, ...updatedData });

      const result = await appointmentService.update(mockAppointment.id, organizationId, updatedData);
      expect(result.duration).toBe(45);
      expect(mockAppointmentRepository.update).toHaveBeenCalledWith(mockAppointment.id, organizationId, updatedData);
    });
  });

  describe('remove', () => {
    it('debería eliminar la cita', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.remove.mockResolvedValue(mockAppointment);

      const result = await appointmentService.remove(mockAppointment.id, organizationId);
      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentRepository.remove).toHaveBeenCalledWith(mockAppointment.id, organizationId);
    });
  });
});