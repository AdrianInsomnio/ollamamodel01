const repository = require('../../../src/modules/cash/register/cashregister.repository');
const service = require('../../../src/modules/cash/register/cashregister.service');

jest.mock('../../../src/modules/cash/register/cashregister.repository');

describe('Cash register operational service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza un saldo inicial que no sea numerico', async () => {
    await expect(service.openShift({
      cashRegisterId: 1,
      userId: 7,
      clinicId: 10,
      openingAmount: 'no-number',
    })).rejects.toMatchObject({ code: 'INVALID_AMOUNT', statusCode: 400 });

    expect(repository.createShiftAtomic).not.toHaveBeenCalled();
  });

  it('abre el turno mediante la operacion atomica del repositorio', async () => {
    repository.findRegisterById.mockResolvedValue({ id: 1, clinicId: 10, isActive: true });
    repository.findOpenShiftByRegister.mockResolvedValue(null);
    repository.findOpenShiftByUser.mockResolvedValue(null);
    repository.createShiftAtomic.mockResolvedValue({ id: 22, status: 'OPEN' });

    await expect(service.openShift({
      cashRegisterId: 1,
      userId: 7,
      clinicId: 10,
      openingAmount: '100.50',
    })).resolves.toEqual({ id: 22, status: 'OPEN' });

    expect(repository.createShiftAtomic).toHaveBeenCalledWith({
      cashRegisterId: 1,
      userId: 7,
      clinicId: 10,
      openingAmount: 100.5,
    });
  });

  it('impide movimientos con importe invalido', async () => {
    await expect(service.createMovement({
      cashShiftId: 4,
      clinicId: 10,
      userId: 7,
      userIdScope: 7,
      type: 'CASH_OUT',
      amount: 'NaN',
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(repository.createMovementAtomic).not.toHaveBeenCalled();
  });

  it('restringe los retiros y movimientos al turno del usuario', async () => {
    repository.findShiftById.mockResolvedValue({ id: 4, status: 'OPEN' });
    repository.createMovementAtomic.mockResolvedValue({ id: 9, type: 'CASH_OUT', amount: 20 });

    await service.createMovement({
      cashShiftId: 4,
      clinicId: 10,
      userId: 7,
      userIdScope: 7,
      type: 'CASH_OUT',
      amount: 20,
    });

    expect(repository.createMovementAtomic).toHaveBeenCalledWith(expect.objectContaining({
      cashShiftId: 4,
      clinicId: 10,
      userId: 7,
      userIdScope: 7,
    }));
  });

  it('rechaza cerrar con efectivo contado invalido', async () => {
    repository.findShiftById.mockResolvedValue({ id: 4, status: 'OPEN', openingAmount: 100 });

    await expect(service.closeShift({
      cashShiftId: 4,
      clinicId: 10,
      userId: 7,
      countedAmount: 'invalid',
    })).rejects.toMatchObject({ code: 'INVALID_AMOUNT', statusCode: 400 });

    expect(repository.closeShiftAtomic).not.toHaveBeenCalled();
  });

  it('no permite ajustes administrativos sobre turnos cerrados', async () => {
    repository.findShiftById.mockResolvedValue({ id: 4, status: 'CLOSED' });

    await expect(service.createAdminAdjustment({
      id: 4,
      clinicId: 10,
      userId: 1,
      amount: 10,
      reason: 'Correccion',
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(repository.createAdminAdjustment).not.toHaveBeenCalled();
  });
});
