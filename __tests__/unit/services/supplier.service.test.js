jest.mock('../../../src/modules/suppliers/supplier.repository');

const repository = require('../../../src/modules/suppliers/supplier.repository');
const service = require('../../../src/modules/suppliers/supplier.service');

describe('Supplier service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('trims provider data and creates it within the authorized clinic', async () => {
    repository.findDuplicate.mockResolvedValue(null);
    repository.create.mockImplementation(async (data) => data);

    const result = await service.create({ name: '  Distribuidora Vet  ', rut: '  123  ' }, 7);

    expect(repository.findDuplicate).toHaveBeenCalledWith({ clinicId: 7, name: 'Distribuidora Vet', rut: '123' });
    expect(result).toMatchObject({ clinicId: 7, name: 'Distribuidora Vet', rut: '123' });
  });

  it('rejects duplicate name or RUT in the same clinic', async () => {
    repository.findDuplicate.mockResolvedValue({ id: 22 });

    await expect(service.create({ name: 'Distribuidora Vet' }, 7))
      .rejects.toMatchObject({ statusCode: 409, code: 'SUPPLIER_ALREADY_EXISTS' });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('scopes provider updates to the authorized clinic', async () => {
    repository.findById.mockResolvedValue({ id: 22, clinicId: 7, name: 'Anterior', rut: null });
    repository.findDuplicate.mockResolvedValue(null);
    repository.update.mockResolvedValue({ id: 22, clinicId: 7, name: 'Nuevo' });

    await service.update(22, 7, { name: 'Nuevo' });

    expect(repository.findById).toHaveBeenCalledWith(22, 7);
    expect(repository.update).toHaveBeenCalledWith(22, 7, { name: 'Nuevo' });
  });

  it('supports deactivation without deleting linked products', async () => {
    repository.findById.mockResolvedValue({ id: 22, clinicId: 7, name: 'Proveedor', _count: { products: 3 } });
    repository.update.mockResolvedValue({ id: 22, isActive: false });

    await service.updateStatus(22, 7, false);

    expect(repository.update).toHaveBeenCalledWith(22, 7, { isActive: false });
  });
});
