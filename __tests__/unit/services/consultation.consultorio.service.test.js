const service = require('../../../src/modules/consultations/consultation.service');
const repository = require('../../../src/modules/consultations/consultation.repository');

jest.mock('../../../src/modules/consultations/consultation.repository');

describe('Consultation consultorio assignment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza horarios solapados con conflicto 409', async () => {
    repository.assignConsultorio.mockRejectedValue(Object.assign(new Error('occupied'), { statusCode: 409 }));

    await expect(service.assignConsultorio(
      1,
      10,
      2,
      '2026-09-08T10:00:00Z',
      '2026-09-08T10:30:00Z'
    )).rejects.toMatchObject({ statusCode: 409 });
  });

  it('libera el consultorio sin eliminar la consulta', async () => {
    repository.releaseConsultorio.mockResolvedValue({ id: 1, consultorioId: null, startAt: null, endAt: null });

    const result = await service.releaseConsultorio(1, 10);

    expect(result.consultorioId).toBeNull();
    expect(repository.releaseConsultorio).toHaveBeenCalledWith(1, 10);
  });
});
