const repository = require('../../../src/modules/cash/register/cashregister.repository');
const service = require('../../../src/modules/cash/register/cashregister.service');

jest.mock('../../../src/modules/cash/register/cashregister.repository');

describe('Cash register admin service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('consulta únicamente las cajas de la clínica autenticada', async () => {
    const registers = [{ id: 1, clinicId: 10, name: 'Principal' }];
    repository.findAdminRegisters.mockResolvedValue(registers);

    await expect(service.getAdminRegisters(10)).resolves.toEqual(registers);
    expect(repository.findAdminRegisters).toHaveBeenCalledWith(10, undefined);
  });

  it('rechaza una caja de otro tenant al editarla', async () => {
    repository.findAdminRegisterById.mockResolvedValue(null);

    await expect(service.updateAdminRegister(5, 10, { name: 'Caja' })).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.updateAdminRegister).not.toHaveBeenCalled();
  });

  it('crea la caja con el tenant recibido del contexto, no con datos editables', async () => {
    repository.findRegisterByName.mockResolvedValue(null);
    repository.createRegister.mockResolvedValue({ id: 2, clinicId: 10, name: 'Nueva' });

    await service.createAdminRegister({ name: ' Nueva ', code: 'CA-01', clinicId: 10 });
    expect(repository.createRegister).toHaveBeenCalledWith({ name: 'Nueva', code: 'CA-01', clinicId: 10, isActive: true });
  });

  it('no permite deshabilitar una caja con turno abierto', async () => {
    repository.findAdminRegisterById.mockResolvedValue({ id: 1, shifts: [{ status: 'OPEN' }] });

    await expect(service.updateAdminRegisterStatus(1, 10, false)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.updateAdminRegisterStatus).not.toHaveBeenCalled();
  });
});
