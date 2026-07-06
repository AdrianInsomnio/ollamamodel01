'use strict';

const petRepository = require('../../../src/modules/pets/pet.repository');

// Mocks
jest.mock('../../../src/modules/pets/pet.repository');

const mockPet = {
  id: 1,
  name: 'Bobby',
  species: 'Dog',
  breed: 'Golden Retriever',
  birthDate: '2020-01-01',
  weight: 25,
  clientId: 1,
  tenantId: 'tenant1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('Pet Service', () => {
  let petService;

  beforeAll(() => {
    petService = require('../../../src/modules/pets/pet.service');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPet', () => {
    it('should create a pet successfully', async () => {
      petRepository.create.mockResolvedValue(mockPet);
      const pet = await petService.createPet(mockPet);
      expect(pet).toEqual(mockPet);
      expect(petRepository.create).toHaveBeenCalledWith(mockPet);
    });

    it('should throw error if name missing', async () => {
      await expect(petService.createPet({ species: 'Dog' })).rejects.toThrow('Name and species are required');
    });

    it('should throw error if species missing', async () => {
      await expect(petService.createPet({ name: 'Bobby' })).rejects.toThrow('Name and species are required');
    });
  });

  describe('getPetById', () => {
    it('should return a pet by ID', async () => {
      petRepository.findById.mockResolvedValue(mockPet);
      const pet = await petService.getPetById(mockPet.id);
      expect(pet).toEqual(mockPet);
      expect(petRepository.findById).toHaveBeenCalledWith(mockPet.id);
    });

    it('should throw error if pet not found', async () => {
      petRepository.findById.mockResolvedValue(null);
      await expect(petService.getPetById(999)).rejects.toThrow('Pet not found');
    });
  });

  describe('getPets', () => {
    it('should return pets with filters', async () => {
      const pets = [mockPet];
      petRepository.findMany.mockResolvedValue(pets);
      const result = await petService.getPets({ limit: 10 });
      expect(result).toEqual(pets);
      expect(petRepository.findMany).toHaveBeenCalledWith({ limit: 10 });
    });
  });

  describe('updatePet', () => {
    it('should update a pet successfully', async () => {
      const updatedData = { name: 'NewName' };
      const updatedPet = { ...mockPet, ...updatedData };
      petService.getPetById = jest.fn().mockResolvedValue(mockPet);
      petRepository.update.mockResolvedValue(updatedPet);
      const pet = await petService.updatePet(mockPet.id, updatedData);
      expect(pet).toEqual(updatedPet);
      expect(petService.getPetById).toHaveBeenCalledWith(mockPet.id);
      expect(petRepository.update).toHaveBeenCalledWith(mockPet.id, updatedData);
    });
  });

  describe('deletePet', () => {
    it('should delete a pet', async () => {
      petService.getPetById = jest.fn().mockResolvedValue(mockPet);
      petRepository.delete.mockResolvedValue(mockPet);
      await petService.deletePet(mockPet.id);
      expect(petService.getPetById).toHaveBeenCalledWith(mockPet.id);
      expect(petRepository.delete).toHaveBeenCalledWith(mockPet.id);
    });
  });
});
