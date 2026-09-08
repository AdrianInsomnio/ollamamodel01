const service = require('../../../src/modules/consultorios/consultorio.service');
const repository = require('../../../src/modules/consultorios/consultorio.repository');
const equipmentRepository = require('../../../src/modules/equipment/equipment.repository');

jest.mock('../../../src/modules/consultorios/consultorio.repository');
jest.mock('../../../src/modules/equipment/equipment.repository');

describe('Consultorio Service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crea el consultorio en la clínica del contexto y no acepta una clínica del body', async () => {
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 1, clinicId: 10, name: 'Consultorio 1', status: 'ACTIVE' });

    await service.create({ name: ' Consultorio 1 ', clinicId: 999 }, 10);

    expect(repository.create).toHaveBeenCalledWith({ name: 'Consultorio 1', description: undefined, size: undefined }, 10);
  });

  it('rechaza nombres duplicados dentro de la clínica', async () => {
    repository.findByName.mockResolvedValue({ id: 2 });

    await expect(service.create({ name: 'Consultorio 1' }, 10)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza intervalos inválidos para disponibilidad', async () => {
    await expect(service.getAvailable(10, '2026-09-08T11:00:00Z', '2026-09-08T10:00:00Z')).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.findAvailable).not.toHaveBeenCalled();
  });

  it('no permite asociar equipamiento de otra clínica', async () => {
    repository.findById.mockResolvedValue({ id: 1, clinicId: 10 });
    equipmentRepository.findById.mockResolvedValue(null);

    await expect(service.addEquipment(1, 10, {
      equipmentId: 20,
      quantity: 1,
      status: 'AVAILABLE',
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rechaza una asociación duplicada', async () => {
    repository.findById.mockResolvedValue({ id: 1, clinicId: 10 });
    equipmentRepository.findById.mockResolvedValue({ id: 20, clinicId: 10, isActive: true });
    repository.findEquipmentAssociation.mockResolvedValue({ id: 99 });

    await expect(service.addEquipment(1, 10, {
      equipmentId: 20,
      quantity: 1,
      status: 'AVAILABLE',
    })).rejects.toMatchObject({ statusCode: 409 });
  });
});
