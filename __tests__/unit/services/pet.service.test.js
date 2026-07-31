'use strict';

const petService = require('../../../src/modules/pets/pet.service');
const petRepository = require('../../../src/modules/pets/pet.repository');
const clientRepository = require('../../../src/modules/clients/client.repository');

jest.mock('../../../src/modules/pets/pet.repository');
jest.mock('../../../src/modules/clients/client.repository');

const mockPetRepository = jest.mocked(petRepository);
const mockClientRepository = jest.mocked(clientRepository);

const validClinicId = 7;

const validPetPayload = {
  name: 'Bobby',
  species: 'Dog',
  breed: 'Golden Retriever',
  birthDate: '2020-01-01',
  weight: 25,
  clientId: 1,
  clinicId: validClinicId,
};

const mockPet = {
  id: 1,
  name: validPetPayload.name,
  species: validPetPayload.species,
  breed: validPetPayload.breed,
  birthDate: new Date(validPetPayload.birthDate).toISOString(),
  weight: validPetPayload.weight,
  clientId: validPetPayload.clientId,
  clinicId: validClinicId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Pet Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPet', () => {
    it('deberia crear una mascota cuando el cliente pertenece a la clinica', async () => {
      mockClientRepository.findById.mockResolvedValue({ id: validPetPayload.clientId, clinicId: validClinicId });
      mockPetRepository.create.mockResolvedValue(mockPet);

      const result = await petService.createPet(validPetPayload);

      expect(mockClientRepository.findById).toHaveBeenCalledWith(validPetPayload.clientId, validClinicId);
      // Joi normaliza birthDate a Date; comparamos contra el payload saneado
      expect(mockPetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validPetPayload.name,
          species: validPetPayload.species,
          breed: validPetPayload.breed,
          clientId: validPetPayload.clientId,
          clinicId: validClinicId,
        }),
        validClinicId
      );
      expect(result).toEqual(mockPet);
    });

    it('deberia lanzar 400 si falta name o species', async () => {
      await expect(petService.createPet({ ...validPetPayload, name: '' })).rejects.toMatchObject({ statusCode: 400 });
      await expect(petService.createPet({ ...validPetPayload, species: '' })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deberia lanzar 404 si el cliente no existe o pertenece a otra clinica', async () => {
      mockClientRepository.findById.mockResolvedValue(null);
      await expect(petService.createPet(validPetPayload)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getPetById', () => {
    it('deberia devolver la mascota si pertenece a la clinica', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue({ id: mockPet.clientId, clinicId: validClinicId });

      const result = await petService.getPetById(mockPet.id, validClinicId);
      expect(result).toEqual(mockPet);
    });

    it('deberia lanzar 404 si la mascota no existe', async () => {
      mockPetRepository.findById.mockResolvedValue(null);
      await expect(petService.getPetById(999, validClinicId)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deberia lanzar 404 si la mascota pertenece a otra clinica', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue(null);
      await expect(petService.getPetById(mockPet.id, validClinicId)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getPets', () => {
    it('deberia pasar clinicId al repositorio', async () => {
      mockPetRepository.findMany.mockResolvedValue([mockPet]);
      const result = await petService.getPets({}, validClinicId);
      expect(mockPetRepository.findMany).toHaveBeenCalledWith({ where: { clinicId: validClinicId } });
      expect(result).toEqual([mockPet]);
    });
  });

  describe('updatePet', () => {
    it('deberia actualizar la mascota', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue({ id: mockPet.clientId, clinicId: validClinicId });
      mockPetRepository.update.mockResolvedValue({ ...mockPet, name: 'NewName' });

      const result = await petService.updatePet(mockPet.id, { name: 'NewName' }, validClinicId);
      expect(result.name).toBe('NewName');
    });

    it('deberia rechazar cambio de clinicId', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue({ id: mockPet.clientId, clinicId: validClinicId });

      await expect(
        petService.updatePet(mockPet.id, { clinicId: 99 }, validClinicId)
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('deletePet', () => {
    it('deberia eliminar la mascota', async () => {
      mockPetRepository.findById.mockResolvedValue(mockPet);
      mockClientRepository.findById.mockResolvedValue({ id: mockPet.clientId, clinicId: validClinicId });
      mockPetRepository.delete.mockResolvedValue(mockPet);

      await petService.deletePet(mockPet.id, validClinicId);
      expect(mockPetRepository.delete).toHaveBeenCalledWith(mockPet.id);
    });
  });
});
